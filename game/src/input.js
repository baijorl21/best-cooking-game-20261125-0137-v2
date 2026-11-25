// Warung Kilat — mouse and keyboard input. One job: turn browser events into
// queues the main loop drains once per frame, with mouse positions already
// scaled into the game's fixed 1280x720 canvas space.

import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.mouse = { x: -1, y: -1, inside: false };
    this.clicks = [];
    this.keys = [];
    this.held = new Set();

    canvas.addEventListener('mousemove', (event) => {
      const pos = this.toCanvas(event.clientX, event.clientY);
      this.mouse.x = pos.x;
      this.mouse.y = pos.y;
      this.mouse.inside = true;
    });
    canvas.addEventListener('mouseleave', () => {
      this.mouse.inside = false;
    });
    canvas.addEventListener('mousedown', (event) => {
      event.preventDefault();
      const pos = this.toCanvas(event.clientX, event.clientY);
      this.clicks.push({ x: pos.x, y: pos.y });
    });
    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      this.keys.push(event.key);
      this.held.add(event.key);
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
      }
    });
    window.addEventListener('keyup', (event) => {
      this.held.delete(event.key);
    });
  }

  toCanvas(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  }

  // Drain the clicks queued since the last frame.
  takeClicks() {
    const clicks = this.clicks;
    this.clicks = [];
    return clicks;
  }

  // Drain the keys queued since the last frame.
  takeKeys() {
    const keys = this.keys;
    this.keys = [];
    return keys;
  }
}

// True when a point sits inside a rectangle.
export function pointInRect(x, y, rect) {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}
