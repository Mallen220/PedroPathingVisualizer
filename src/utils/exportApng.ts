// Copyright 2026 Matthew Allen. Licensed under the Apache License, Version 2.0.
// Utility to export the current Two.js view / animation as an APNG.
// Uses upng-js to encode frames.

import UPNG from "upng-js";
import type Two from "two.js";

export interface ExportApngOptions {
  two: Two; // Two.js instance
  animationController: any; // controller from createAnimationController
  durationSec: number; // total duration in seconds
  fps?: number; // frames per second
  scale?: number; // resolution scale (0.1 to 1.0+)
  quality?: number; // Color quantization (0 = lossless, >0 = number of colors, e.g. 256)
  filename?: string; // suggested filename
  onProgress?: (progress: number) => void; // 0..1
  /** Optional background image URL to draw under the SVG frames (e.g., field map) */
  backgroundImageSrc?: string;
  /** Optional robot overlay image to draw on top of frames */
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

export async function exportPathToApng(
  options: ExportApngOptions,
): Promise<Blob> {
  const {
    two,
    animationController,
    durationSec,
    fps = 15,
    scale = 1,
    quality = 0, // Default to lossless (0) for APNG if not specified, or use small palette if user wants
    onProgress,
    backgroundImageSrc,
  } = options;

  // Save state
  const prevPlaying = animationController.isPlaying?.() ?? false;
  const prevPercent = animationController.getPercent?.() ?? 0;

  // Pause animation to take clean snapshots
  if (animationController.pause) animationController.pause();

  // Prepare canvas for rasterizing SVG
  const svgEl = (two.renderer as any).domElement as SVGElement;
  const rect = svgEl.getBoundingClientRect();
  const width = Math.round(rect.width * scale);
  const height = Math.round(rect.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Optional: Enable better image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Optionally preload a background image (field map) so it can be drawn under each frame
  let backgroundImage: HTMLImageElement | null = null;
  if (backgroundImageSrc) {
    backgroundImage = new Image();
    backgroundImage.crossOrigin = "anonymous";
    backgroundImage.src = backgroundImageSrc;

    try {
      await new Promise<void>((resolve) => {
        backgroundImage!.onload = () => resolve();
        backgroundImage!.onerror = () => {
          console.warn("Failed to load background image for APNG export");
          backgroundImage = null;
          resolve();
        };
      });
    } catch (e) {
      backgroundImage = null;
    }
  }

  // Optionally preload the robot overlay image
  let robotImage: HTMLImageElement | null = null;
  if (options.robotImageSrc) {
    robotImage = new Image();
    robotImage.crossOrigin = "anonymous";
    robotImage.src = options.robotImageSrc;

    try {
      await new Promise<void>((resolve) => {
        robotImage!.onload = () => resolve();
        robotImage!.onerror = () => {
          console.warn("Failed to load robot image for APNG export");
          robotImage = null;
          resolve();
        };
      });
    } catch (e) {
      robotImage = null;
    }
  }

  const buffers: ArrayBuffer[] = [];
  const delays: number[] = [];

  // Calculate frames
  const calculatedFrames = Math.ceil(durationSec * fps);
  const MAX_FRAMES = 300; // safety cap
  const frames = Math.max(2, Math.min(calculatedFrames, MAX_FRAMES));
  const delayMs = Math.round(1000 / fps);

  // Helper to capture frame
  async function captureFrame(percent: number) {
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
        ctx.clearRect(0, 0, width, height);

        // Draw background
        if (backgroundImage) {
          try {
            ctx.drawImage(backgroundImage, 0, 0, width, height);
          } catch (e) {
            /* ignore */
          }
        }

        // Draw SVG
        ctx.drawImage(img, 0, 0, width, height);

        // Draw robot overlay
        if (robotImage && options.getRobotState) {
          try {
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
          } catch (e) {
            /* ignore */
          }
        }

        // Get pixel data
        const imageData = ctx.getImageData(0, 0, width, height);
        // Copy buffer because getImageData might reuse or be detached?
        // Actually Uint8ClampedArray.buffer refers to the underlying buffer.
        // We should slice it to ensure we have a distinct copy if needed,
        // but typically for upng we just need the buffer.
        // However, standard says buffer is the whole thing.
        buffers.push(imageData.data.buffer.slice(0));
        delays.push(delayMs);

        resolve();
      };
      img.onerror = reject;
      img.src = data;
    });
  }

  // Capture loop
  for (let i = 0; i < frames; i++) {
    const percent = (i / (frames - 1)) * 100;
    if (animationController.seekToPercent)
      animationController.seekToPercent(percent);
    two.update();

    await captureFrame(percent);

    if (onProgress) {
      // 0.0 to 0.8 for capture
      onProgress(((i + 1) / frames) * 0.8);
    }
  }

  // Restore state
  if (animationController.seekToPercent)
    animationController.seekToPercent(prevPercent);
  if (prevPlaying && animationController.play) animationController.play();

  // Encoding phase
  if (onProgress) onProgress(0.9);

  // Yield to main thread briefly to let UI update before the heavy synchronous encode
  await new Promise((r) => setTimeout(r, 50));

  // cnum: 0 for lossless (APNG can be large), or 256 for indexed color
  // Since GIF quality 10 is somewhat lossy, we can support lossy APNG too.
  // If quality passed is 0, we do lossless. If > 0, we treat it as color count (e.g. 256).
  // The GIF dialog uses 'quality' 1-30 where 1 is best.
  // We can map this: 1 -> lossless or high colors, 30 -> fewer colors?
  // Actually upng cnum=0 is lossless. cnum=256 is standard 8-bit.
  // Let's assume for APNG, users might want high quality.
  // If the passed 'quality' (from GIF dialog) is used, we might need to interpret it.
  // GIF quality 10 (default) is good.
  // Let's use cnum = 0 (lossless) if 'quality' < 5, else cnum = 256.
  // Or just always use 0 (lossless) unless specifically requested otherwise?
  // APNGs can be huge if lossless.
  // Let's try cnum = 0 by default for "Best" quality setting in dialog (quality <= 5).
  // And cnum = 256 for others to save space.

  let cnum = 0;
  if (quality > 5) {
    cnum = 256;
  }

  const pngBuffer = UPNG.encode(buffers, width, height, cnum, delays);

  if (onProgress) onProgress(1.0);

  return new Blob([pngBuffer], { type: "image/png" });
}
