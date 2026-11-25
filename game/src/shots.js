// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world, steered by a simple autopilot that does
// what a player does — grill the meat, collect it when ready, build the
// focused order on the plate and serve it — so the frame is what a real game
// looks like and the same seed always gives the same frame.

import { dishMatchingPlate, ingredientById } from './recipes.js';
import {
  EVENT_OVER,
  addFromBin,
  addFromTray,
  collectGrill,
  focusOrder,
  grillStatus,
  missingForFocus,
  resetWorld,
  servePlate,
  spawnOrder,
  stepWorld,
} from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

// One autopilot decision per tick: collect ready food first, then work on the
// focused order — tray first, grill second, counter last — then serve a
// finished plate. `sloppy` skips some decisions, like a hurried player.
function autopilot(world, sloppy) {
  const state = world.state;
  if (state.over) return;
  if (sloppy && world.random() < 0.45) return;

  for (let i = 0; i < state.grill.length; i += 1) {
    const status = grillStatus(world, i);
    if (status === 'ready' || status === 'burnt' || status === 'overdone') {
      collectGrill(world, i);
      return;
    }
  }

  const order = focusOrder(world);
  if (!order) return;
  // Serve only when the plate really matches an open order; a partial plate
  // is still being built, not a failed serve.
  if (state.plate.length > 0) {
    const match = dishMatchingPlate(state.plate);
    if (match && state.orders.some((o) => o.dishId === match.id)) {
      servePlate(world);
      return;
    }
  }

  const missing = missingForFocus(world);
  for (const id of missing) {
    const ing = ingredientById(id);
    const trayAt = state.tray.indexOf(id);
    if (trayAt !== -1) {
      addFromTray(world, trayAt);
      return;
    }
    if (ing.grill) {
      if (state.grill.some((slot) => slot && slot.ing === id)) return;
      if (state.grill.some((slot) => slot === null)) {
        addFromBin(world, id);
        return;
      }
      return;
    }
    addFromBin(world, id);
    return;
  }
}

// Make sure the play frame shows a dish mid-assembly, food on the grill and
// orders on the board, even if the autopilot happened to serve everything a
// moment earlier. Every step uses the real action functions, so the frame is
// a state a player could really be in.
function guaranteeBusyKitchen(world) {
  const state = world.state;
  while (state.orders.length < 2) spawnOrder(world);
  if (state.plate.length === 0) {
    const missing = missingForFocus(world);
    for (const id of missing) {
      const ing = ingredientById(id);
      if (!ing.grill) addFromBin(world, id);
      if (state.plate.length >= 2) break;
    }
  }
  if (!state.grill.some((slot) => slot)) {
    const missing = missingForFocus(world);
    const grillId = missing.find((id) => ingredientById(id).grill);
    if (grillId) addFromBin(world, grillId);
  }
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it.
 */
export function stageShot(name, world) {
  resetWorld(world, world.seed);
  if (name !== 'play' && name !== 'end') {
    for (let t = 0; t < START_SECONDS; t += SAMPLE) stepWorld(world, SAMPLE);
    return { screen: SCREEN_TITLE };
  }
  const sloppy = name === 'end';
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  for (let t = 0; t < limit; t += SAMPLE) {
    autopilot(world, sloppy);
    const events = stepWorld(world, SAMPLE);
    if (events & EVENT_OVER) break;
  }
  if (name === 'play') {
    guaranteeBusyKitchen(world);
    for (let t = 0; t < 2; t += SAMPLE) stepWorld(world, SAMPLE);
  }
  return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY };
}
