import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loadTrajectoryFromFile,
  downloadTrajectory,
  updateRobotImageDisplay,
} from "./file";
import type { SaveData } from "./file";

describe("File Utilities", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Reset DOM
    document.body.innerHTML = "";
  });

  describe("loadTrajectoryFromFile", () => {
    it("parses valid .pp file correctly", () => {
      const mockData: SaveData = {
        startPoint: {
          x: 0,
          y: 0,
          heading: "constant",
          degrees: 0,
          startDeg: 0,
          endDeg: 0,
          reversed: false,
          reverse: false,
          type: "point",
        },
        lines: [],
        shapes: [],
      };

      const file = new File([JSON.stringify(mockData)], "test.pp", {
        type: "application/json",
      });
      const mockEvent = {
        target: {
          files: [file],
        },
      } as unknown as Event;

      const onSuccess = vi.fn();
      const onError = vi.fn();

      loadTrajectoryFromFile(mockEvent, onSuccess, onError);
    });

    it("rejects non-.pp files", () => {
      const file = new File(["{}"], "test.txt", { type: "text/plain" });
      const mockEvent = {
        target: {
          files: [file],
        },
      } as unknown as Event;

      const onSuccess = vi.fn();
      const onError = vi.fn();
      const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

      loadTrajectoryFromFile(mockEvent, onSuccess, onError);

      expect(onError).toHaveBeenCalled();
      expect(alertMock).toHaveBeenCalledWith("Please select a .pp file");
    });
  });

  describe("downloadTrajectory", () => {
    it("creates and clicks a download link", () => {
      const mockData: SaveData = {
        startPoint: {
          x: 0,
          y: 0,
          heading: "constant",
          degrees: 0,
          startDeg: 0,
          endDeg: 0,
          reversed: false,
          reverse: false,
          type: "point",
        },
        lines: [],
        shapes: [],
      };

      // Mock URL methods
      global.URL.createObjectURL = vi.fn(() => "blob:test");
      global.URL.revokeObjectURL = vi.fn();

      // Spy on appendChild and removeChild
      const appendChildSpy = vi.spyOn(document.body, "appendChild");
      const removeChildSpy = vi.spyOn(document.body, "removeChild");

      // Mock createElement to return a real element, but spy on click
      const realCreateElement = document.createElement.bind(document);
      const clickSpy = vi.fn();

      vi.spyOn(document, "createElement").mockImplementation((tagName) => {
        const el = realCreateElement(tagName);
        if (tagName === "a") {
          // @ts-ignore
          el.click = clickSpy;
        }
        return el;
      });

      downloadTrajectory(mockData.startPoint, mockData.lines, mockData.shapes!);

      expect(appendChildSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();

      // Check the element passed to appendChild
      const appendedElement = appendChildSpy.mock
        .calls[0][0] as HTMLAnchorElement;
      expect(appendedElement.download).toBe("trajectory.pp");
    });
  });

  describe("updateRobotImageDisplay", () => {
    it("updates image source from local storage", () => {
      const mockImg = document.createElement("img");
      mockImg.alt = "Robot";
      document.body.appendChild(mockImg);

      const mockSrc = "data:image/png;base64,test";
      vi.spyOn(Storage.prototype, "getItem").mockReturnValue(mockSrc);

      updateRobotImageDisplay();

      expect(mockImg.src).toBe(mockSrc);
    });
  });
});
