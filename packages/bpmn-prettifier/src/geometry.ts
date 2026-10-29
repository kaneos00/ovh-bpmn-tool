import type { Bounds } from "./model.js";

export function intersects(a: Bounds, b: Bounds): boolean {
  return a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;
}

export function centerX(b: Bounds): number {
  return b.x + b.width / 2;
}

export function centerY(b: Bounds): number {
  return b.y + b.height / 2;
}
