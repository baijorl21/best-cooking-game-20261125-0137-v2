// Warung Kilat — layout, tuning and palette.
// One job: every number the rest of the game agrees on lives here, so the
// kitchen, the order board and the counters line up on a 1280x720 canvas.

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

// A full shift lasts two minutes; the results screen follows at once.
export const SHIFT_SECONDS = 120;

// How many order tickets can wait on the board at once.
export const MAX_ORDERS = 3;

// Grill slots and cooked-food tray slots.
export const GRILL_SLOTS = 2;
export const TRAY_SLOTS = 4;

// The plate never holds more items than the longest recipe plus one spare.
export const PLATE_SLOTS = 5;

// Grill timing: a patty or chicken piece is raw, then ready, then burnt.
export const GRILL_OK_EXTRA = 3.0;
export const GRILL_BURN_AFTER = 8.0;

// Order pressure ramps with the shift clock.
export function spawnIntervalAt(elapsed) {
  return Math.max(4.5, 10 - elapsed * 0.045);
}
export function orderDurationAt(elapsed) {
  return Math.max(22, 36 - elapsed * 0.09);
}

// Star thresholds on coins earned in one shift.
export const STAR_COINS = [60, 120, 180];

// Layout rectangles, in canvas pixels.
export const LAYOUT = {
  topBar: { x: 0, y: 0, w: 1280, h: 64 },
  board: { x: 16, y: 72, w: 1248, h: 104 },
  grill: { x: 32, y: 196, w: 330, h: 244 },
  plate: { x: 394, y: 196, w: 492, h: 244 },
  side: { x: 918, y: 196, w: 330, h: 244 },
  bins: { x: 32, y: 464, w: 1216, h: 176 },
  hints: { x: 32, y: 656, w: 1216, h: 44 },
};

// Six ingredient bins share the bottom strip evenly.
export const BIN_COUNT = 6;
export function binRect(index) {
  const area = LAYOUT.bins;
  const gap = 10;
  const w = (area.w - gap * (BIN_COUNT - 1)) / BIN_COUNT;
  return { x: area.x + index * (w + gap), y: area.y, w, h: area.h };
}

export const COLORS = {
  wallTop: '#f7c873',
  wallBottom: '#e89b4d',
  floor: '#8a5a2e',
  counter: '#6b4423',
  counterEdge: '#4e2f16',
  panel: '#fff3d6',
  panelEdge: '#d9a441',
  ink: '#3a2410',
  softInk: '#7a5a34',
  ticket: '#fffaf0',
  ticketUrgent: '#ffe1d6',
  grillBody: '#3d3d46',
  grillHot: '#ff7b2f',
  plateWhite: '#fdfdf8',
  gold: '#f5b301',
  green: '#2fa866',
  red: '#d63c2f',
  blue: '#2f7fd6',
};
