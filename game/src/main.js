// Warung Kilat — entry point: the frame loop, the screens, and the wiring
// between clicks, keys, sounds and the world. One job: run the game.

// ?shot=start|play|end&seed=N renders one frozen, staged scene for the
// screenshots; without it the game plays live from the title screen.

import { CANVAS_HEIGHT, CANVAS_WIDTH } from './config.js';
import { SoundBank } from './audio.js';
import { Input, pointInRect } from './input.js';
import { INGREDIENTS } from './recipes.js';
import {
  EVENT_BURNT,
  EVENT_EXPIRED,
  EVENT_OVER,
  addFromBin,
  addFromTray,
  collectGrill,
  createWorld,
  grillActive,
  removePlateItem,
  resetWorld,
  servePlate,
  stepWorld,
  trashPlate,
} from './world.js';
import { SCREEN_OVER, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE, drawGame } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusLine = document.getElementById('status');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? '') || Math.floor(Math.random() * 100000);

const sounds = new SoundBank();
const input = new Input(canvas);
const world = createWorld(seed);

const ui = { hotspots: [], mouse: input.mouse };
let screen = SCREEN_TITLE;
let best = 0;

// Announce big moments to screen readers.
function announce(message) {
  if (statusLine) statusLine.textContent = message;
}

function startShift() {
  sounds.ensure();
  resetWorld(world, Math.floor(Math.random() * 100000));
  screen = SCREEN_PLAY;
  announce('Shift dimulai! Baca pesanan di papan atas.');
}

function restartShift() {
  startShift();
}

function handleHotspot(hotspot) {
  sounds.ensure();
  const state = world.state;
  switch (hotspot.action) {
    case 'bin': {
      const result = addFromBin(world, hotspot.arg);
      if (result === 'grill' || result === 'plate') sounds.pick();
      else if (result === 'full') sounds.buzz();
      break;
    }
    case 'grill': {
      const result = collectGrill(world, hotspot.arg);
      if (result === 'cooked') sounds.plop();
      else if (result === 'burnt') sounds.trash();
      else if (result === 'raw') sounds.pick();
      break;
    }
    case 'tray': {
      if (addFromTray(world, hotspot.arg) === 'plate') sounds.plop();
      break;
    }
    case 'plate': {
      removePlateItem(world, hotspot.arg);
      sounds.pick();
      break;
    }
    case 'serve': {
      const result = servePlate(world);
      if (result.ok) {
        sounds.ding();
        announce(`Tersaji! ${result.earned} koin.`);
      } else {
        sounds.buzz();
      }
      break;
    }
    case 'trash': {
      if (trashPlate(world) === 'trashed') sounds.trash();
      break;
    }
    default:
      break;
  }
  void state;
}

function handleClick(click) {
  if (screen === SCREEN_TITLE) {
    startShift();
    return;
  }
  if (screen === SCREEN_OVER) {
    restartShift();
    return;
  }
  if (screen !== SCREEN_PLAY) return;
  for (let i = ui.hotspots.length - 1; i >= 0; i -= 1) {
    const hotspot = ui.hotspots[i];
    if (pointInRect(click.x, click.y, hotspot)) {
      handleHotspot(hotspot);
      return;
    }
  }
}

function handleKey(key) {
  const lower = key.toLowerCase();
  if (key === 'Enter' && screen === SCREEN_TITLE) {
    startShift();
    return;
  }
  if ((lower === 'r') && screen === SCREEN_OVER) {
    restartShift();
    return;
  }
  if (lower === 'm') {
    sounds.setMuted(!sounds.muted);
    announce(sounds.muted ? 'Suara mati.' : 'Suara hidup.');
    return;
  }
  if (lower === 'p' && (screen === SCREEN_PLAY || screen === SCREEN_PAUSE)) {
    screen = screen === SCREEN_PLAY ? SCREEN_PAUSE : SCREEN_PLAY;
    if (screen === SCREEN_PAUSE) sounds.stopSizzle();
    announce(screen === SCREEN_PAUSE ? 'Jeda.' : 'Lanjut masak!');
    return;
  }
  if (screen !== SCREEN_PLAY) return;
  const bin = INGREDIENTS.find((ing) => ing.key === key);
  if (bin) {
    sounds.ensure();
    const result = addFromBin(world, bin.id);
    if (result === 'grill' || result === 'plate') sounds.pick();
    else if (result === 'full') sounds.buzz();
    return;
  }
  if (key === ' ') {
    const result = servePlate(world);
    if (result.ok) sounds.ding();
    else sounds.buzz();
  }
  if (lower === 't') {
    if (trashPlate(world) === 'trashed') sounds.trash();
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - frame.last) / 1000 || 0);
  frame.last = now;

  for (const key of input.takeKeys()) handleKey(key);
  for (const click of input.takeClicks()) handleClick(click);

  if (screen === SCREEN_PLAY) {
    const events = stepWorld(world, dt);
    if (events & EVENT_EXPIRED) sounds.buzz();
    if (events & EVENT_BURNT) sounds.buzz();
    if (events & EVENT_OVER) {
      sounds.stopSizzle();
      best = Math.max(best, world.state.coins);
      announce(`Shift selesai! ${world.state.coins} koin, ${world.state.served} hidangan tersaji.`);
      screen = SCREEN_OVER;
    }
    if (grillActive(world)) sounds.startSizzle();
    else sounds.stopSizzle();
  }

  drawGame(ctx, world, screen, ui);
  requestAnimationFrame(frame);
}
frame.last = performance.now();

// Screenshot mode: stage one frozen scene and draw it every frame without
// advancing the clock, so the capture is exactly the staged frame.
if (shotName) {
  const staged = stageShot(shotName, world);
  screen = staged.screen;
  best = world.state.coins;
  drawGame(ctx, world, screen, ui);
  requestAnimationFrame(function frozen() {
    drawGame(ctx, world, screen, ui);
    requestAnimationFrame(frozen);
  });
} else {
  stageShot('start', world);
  screen = SCREEN_TITLE;
  requestAnimationFrame(frame);
}
