
export function getTransformedCoordinates(
    clientX: number,
    clientY: number,
    rect: DOMRect,
    rotation: number,
  ) {
    // 1. Get coordinates relative to the bounding box (Top-Left of visual box)
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    // 2. Center them
    const w = rect.width;
    const h = rect.height;
    const cx = px - w / 2;
    const cy = py - h / 2;

    // 3. Rotate BACKWARDS (undo the container rotation)
    // If container is rotated by R, we rotate by -R to find original coords
    const rad = (-rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const nx = cx * cos - cy * sin;
    const ny = cx * sin + cy * cos;

    // 4. Un-center (relative to original Top-Left)
    const newPx = nx + w / 2;
    const newPy = ny + h / 2;

    return { x: newPx, y: newPy };
  }
