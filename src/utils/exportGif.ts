// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
// Utility to export the current Two.js view / animation as a GIF.
// Uses gif.js to encode frames in the renderer.

import GIF from "gif.js";
// Vite: import worker script URL so gif.js can spawn workers correctly
import gifWorkerUrl from "gif.js/dist/gif.worker.js?url";
import UPNG from "upng-js";
import type Two from "two.js";

export interface ExportAnimationOptions {
  two: Two; // Two.js instance
  animationController: any; // controller from createAnimationController
  durationSec: number; // total duration in seconds
  fps?: number; // frames per second
  scale?: number; // resolution scale (0.1 to 1.0+)
  quality?: number; // gif.js quality parameter (1=best, 30=worst)
  filename?: string; // suggested filename
  onProgress?: (progress: number) => void; // 0..1
  /** Optional background image URL to draw under the SVG frames (e.g., field map) */
  backgroundImageSrc?: string; /** Optional robot overlay image to draw on top of frames */
  robotImageSrc?: string;
  /** Robot display size in pixels (unscaled) */
  robotLengthPx?: number;
  robotWidthPx?: number;
  /** Function to compute robot state (x,y in pixels and heading in degrees) for a given percent (0..100) */
  getRobotState?: (percent: number) => {
    x: number;
    y: number;
    heading: number;
  };
}

// Alias for backward compatibility
export type ExportGifOptions = ExportAnimationOptions;

async function prepareAnimationResources(options: ExportAnimationOptions) {
  const { backgroundImageSrc, robotImageSrc } = options;

  let backgroundImage: HTMLImageElement | null = null;
  if (backgroundImageSrc) {
    backgroundImage = new Image();
    backgroundImage.crossOrigin = "anonymous";
    backgroundImage.src = backgroundImageSrc;
    try {
      await new Promise<void>((resolve) => {
        backgroundImage!.onload = () => resolve();
        backgroundImage!.onerror = () => {
          backgroundImage = null;
          resolve();
        };
      });
    } catch {
      backgroundImage = null;
    }
  }

  let robotImage: HTMLImageElement | null = null;
  if (robotImageSrc) {
    robotImage = new Image();
    robotImage.crossOrigin = "anonymous";
    robotImage.src = robotImageSrc;
    try {
      await new Promise<void>((resolve) => {
        robotImage!.onload = () => resolve();
        robotImage!.onerror = () => {
          robotImage = null;
          resolve();
        };
      });
    } catch {
      robotImage = null;
    }
  }

  return { backgroundImage, robotImage };
}

async function renderFrameToCanvas(
  two: Two,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  backgroundImage: HTMLImageElement | null,
  robotImage: HTMLImageElement | null,
  options: ExportAnimationOptions,
  percent: number,
  scale: number,
) {
  const svgEl = (two.renderer as any).domElement as SVGElement;
  // Serialize the SVG
  const svgString = new XMLSerializer().serializeToString(svgEl);
  const hasNs = svgString.indexOf("xmlns=") >= 0;
  const svgWithNs = hasNs
    ? svgString
    : svgString.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  const data =
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgWithNs);

  const img = new Image();
  img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw background
      if (backgroundImage) {
        try {
          ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
        } catch (e) {
          console.warn("Failed to draw background image:", e);
        }
      }

      // Draw SVG
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw robot overlay
      try {
        if (robotImage && options.getRobotState) {
          const state = options.getRobotState(percent);
          if (state && !Number.isNaN(state.x) && !Number.isNaN(state.y)) {
            ctx.save();
            ctx.translate(state.x * scale, state.y * scale);
            ctx.rotate((state.heading * Math.PI) / 180);
            const rw =
              (options.robotLengthPx ?? (robotImage.width || 0)) * scale;
            const rh =
              (options.robotWidthPx ?? (robotImage.height || 0)) * scale;
            ctx.drawImage(robotImage, -rw / 2, -rh / 2, rw, rh);
            ctx.restore();
          }
        }
      } catch (e) {
        console.warn("Failed to draw robot overlay:", e);
      }
      resolve();
    };
    img.onerror = (err) => reject(err);
    img.src = data;
  });
}

export async function exportPathToApng(
  options: ExportAnimationOptions,
): Promise<Blob> {
  const {
    two,
    animationController,
    durationSec,
    fps = 15,
    scale = 1,
    onProgress,
  } = options;

  const prevPlaying = animationController.isPlaying?.() ?? false;
  const prevPercent = animationController.getPercent?.() ?? 0;
  if (animationController.pause) animationController.pause();

  const svgEl = (two.renderer as any).domElement as SVGElement;
  const rect = svgEl.getBoundingClientRect();
  const width = Math.round(rect.width * scale);
  const height = Math.round(rect.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const { backgroundImage, robotImage } =
    await prepareAnimationResources(options);

  const calculatedFrames = Math.ceil(durationSec * fps);
  const MAX_FRAMES = 300;
  const frames = Math.max(2, Math.min(calculatedFrames, MAX_FRAMES));
  const delayMs = Math.round(1000 / fps);

  const frameBuffers: ArrayBuffer[] = [];
  const delays: number[] = [];

  for (let i = 0; i < frames; i++) {
    const percent = (i / (frames - 1)) * 100;
    if (animationController.seekToPercent)
      animationController.seekToPercent(percent);
    two.update();

    await renderFrameToCanvas(
      two,
      canvas,
      ctx,
      backgroundImage,
      robotImage,
      options,
      percent,
      scale,
    );

    // Get RGBA data
    const imageData = ctx.getImageData(0, 0, width, height);
    frameBuffers.push(imageData.data.buffer);
    delays.push(delayMs);

    if (onProgress) {
      onProgress(((i + 1) / frames) * 0.8);
    }
  }

  // Restore state
  if (animationController.seekToPercent)
    animationController.seekToPercent(prevPercent);
  if (prevPlaying && animationController.play) animationController.play();

  // Encode APNG
  if (onProgress) onProgress(0.9);
  // cnum=0 for full color
  const pngBuffer = UPNG.encode(frameBuffers, width, height, 0, delays);
  if (onProgress) onProgress(1.0);

  return new Blob([pngBuffer], { type: "image/png" });
}

export async function exportPathToGif(
  options: ExportAnimationOptions,
): Promise<Blob> {
  const {
    two,
    animationController,
    durationSec,
    fps = 15,
    scale = 1,
    quality = 20,
    onProgress,
  } = options;

  const prevPlaying = animationController.isPlaying?.() ?? false;
  const prevPercent = animationController.getPercent?.() ?? 0;
  if (animationController.pause) animationController.pause();

  const svgEl = (two.renderer as any).domElement as SVGElement;
  const rect = svgEl.getBoundingClientRect();
  const width = Math.round(rect.width * scale);
  const height = Math.round(rect.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const { backgroundImage, robotImage } =
    await prepareAnimationResources(options);

  const gif = new GIF({
    workers: 2,
    quality: quality,
    width,
    height,
    workerScript: gifWorkerUrl,
  });

  if (onProgress) {
    gif.on("progress", (p: number) => {
      onProgress(0.5 + p * 0.5);
    });
  }

  const framesDataURLs: string[] = [];
  const calculatedFrames = Math.ceil(durationSec * fps);
  const MAX_FRAMES = 300;
  const frames = Math.max(2, Math.min(calculatedFrames, MAX_FRAMES));
  const delayMs = Math.round(1000 / fps);

  for (let i = 0; i < frames; i++) {
    const percent = (i / (frames - 1)) * 100;
    if (animationController.seekToPercent)
      animationController.seekToPercent(percent);
    two.update();

    await renderFrameToCanvas(
      two,
      canvas,
      ctx,
      backgroundImage,
      robotImage,
      options,
      percent,
      scale,
    );

    // Fallback data
    try {
      framesDataURLs.push(canvas.toDataURL("image/png"));
    } catch {}

    try {
      gif.addFrame(ctx, { copy: true, delay: delayMs });
    } catch (e) {
      console.warn("gif.addFrame failed:", e);
    }

    if (onProgress) {
      onProgress(((i + 1) / frames) * 0.5);
    }
  }

  // Restore state
  if (animationController.seekToPercent)
    animationController.seekToPercent(prevPercent);
  if (prevPlaying && animationController.play) animationController.play();

  // Return a promise that resolves with the compiled Blob. If worker encoding doesn't start, fallback to main-thread encoding using stored frame data.
  const blob: Blob = await new Promise(async (resolve, reject) => {
    let encodeStarted = false;
    const fallbackTimeout = setTimeout(async () => {
      if (!encodeStarted) {
        console.warn(
          "Worker encoding not detected — falling back to main-thread encode",
        );
        try {
          // Main-thread fallback using stored frames
          const gif2 = new GIF({
            workers: 0,
            quality: quality,
            width: canvas.width,
            height: canvas.height,
          });
          if (onProgress) onProgress(0.5); // notify UI that encoding has started

          if (onProgress) {
            gif2.on("progress", (p: number) => {
              console.debug("Fallback GIF encode progress:", p);
              onProgress(0.5 + p * 0.5);
            });
          }

          // Add frames from framesDataURLs
          for (let i = 0; i < framesDataURLs.length; i++) {
            const dataUrl = framesDataURLs[i];
            await new Promise<void>((res, rej) => {
              const im = new Image();
              im.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(im, 0, 0, canvas.width, canvas.height);
                try {
                  gif2.addFrame(ctx, { copy: true, delay: delayMs });
                } catch (e) {
                  console.warn("gif2.addFrame failed:", e);
                }
                res();
              };
              im.onerror = (e) => rej(e);
              im.src = dataUrl;
            });
          }

          gif2.on("finished", (blobObj: Blob) => resolve(blobObj));
          gif2.on("error", (err: any) => reject(err));
          gif2.render();
        } catch (err) {
          reject(err);
        }
      }
    }, 3000); // 3s timeout to detect stalled worker

    gif.on("finished", (blobObj: Blob) => {
      clearTimeout(fallbackTimeout);
      resolve(blobObj);
    });
    gif.on("error", (err: any) => {
      clearTimeout(fallbackTimeout);
      reject(err);
    });
    gif.on("progress", (p: number) => {
      encodeStarted = true; // mark that worker encoding is happening
    });

    try {
      console.debug("Starting worker render...");
      if (onProgress) onProgress(0.5);
      gif.render();
    } catch (err) {
      clearTimeout(fallbackTimeout);
      reject(err);
    }
  });

  return blob;
}
