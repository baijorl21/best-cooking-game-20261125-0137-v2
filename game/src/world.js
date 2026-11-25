// Warung Kilat — the kitchen itself: shift clock, order tickets, grill slots,
// cooked tray, assembly plate, coins and combo. One job: the rules, with no
// drawing and no sound, so the screenshot autopilot can play the real game.

import {
  GRILL_BURN_AFTER,
  GRILL_OK_EXTRA,
  GRILL_SLOTS,
  MAX_ORDERS,
  PLATE_SLOTS,
  SHIFT_SECONDS,
  STAR_COINS,
  TRAY_SLOTS,
  orderDurationAt,
  spawnIntervalAt,
} from './config.js';
import { createRandom, pickOne } from './random.js';
import { DISHES, dishById, ingredientById } from './recipes.js';

export const EVENT_SERVED = 1;
export const EVENT_EXPIRED = 2;
export const EVENT_OVER = 4;
export const EVENT_WRONG = 8;
export const EVENT_BURNT = 16;

export function createWorld(seed) {
  const world = {
    seed,
    random: createRandom(seed),
    state: null,
  };
  resetWorld(world, seed);
  return world;
}

export function resetWorld(world, seed) {
  world.seed = seed;
  world.random = createRandom(seed);
  world.state = {
    time: 0,
    timeLeft: SHIFT_SECONDS,
    coins: 0,
    served: 0,
    combo: 0,
    bestCombo: 0,
    over: false,
    stars: 0,
    spawnIn: 1.2,
    nextOrderId: 1,
    orders: [],
    grill: Array.from({ length: GRILL_SLOTS }, () => null),
    tray: [],
    plate: [],
    floats: [],
    message: '',
    messageLife: 0,
  };
  spawnOrder(world);
  spawnOrder(world);
}

export function spawnOrder(world) {
  const state = world.state;
  if (state.orders.length >= MAX_ORDERS) return null;
  const dish = pickOne(world.random, DISHES);
  const duration = orderDurationAt(state.time);
  const order = {
    id: state.nextOrderId,
    dishId: dish.id,
    timeLeft: duration,
    total: duration,
  };
  state.nextOrderId += 1;
  state.orders.push(order);
  return order;
}

export function dishOf(order) {
  return dishById(order.dishId);
}

// The first order whose dish still needs a plate item, or the first order.
export function focusOrder(world) {
  const state = world.state;
  if (state.orders.length === 0) return null;
  for (const order of state.orders) {
    const dish = dishOf(order);
    if (dish.ingredients.some((id) => !state.plate.includes(id))) return order;
  }
  return state.orders[0];
}

// Ingredients the focused order still needs on the plate.
export function missingForFocus(world) {
  const order = focusOrder(world);
  if (!order) return [];
  const dish = dishOf(order);
  const plate = [...world.state.plate];
  const missing = [];
  for (const id of dish.ingredients) {
    const at = plate.indexOf(id);
    if (at === -1) missing.push(id);
    else plate.splice(at, 1);
  }
  return missing;
}

function addFloat(state, x, y, text, color) {
  state.floats.push({ x, y, text, color, life: 1.4 });
}

function sameMultiset(a, b) {
  if (a.length !== b.length) return false;
  return [...a].sort().join(',') === [...b].sort().join(',');
}

function finishShift(world) {
  const state = world.state;
  state.over = true;
  state.timeLeft = 0;
  state.stars = STAR_COINS.filter((bar) => state.coins >= bar).length;
}

// Advance the clock, grill, order timers and floating feedback by dt seconds.
// Returns a bitmask of EVENT_* flags for sounds and messages.
export function stepWorld(world, dt) {
  const state = world.state;
  let events = 0;
  if (state.over) return events;
  state.time += dt;
  state.timeLeft = Math.max(0, SHIFT_SECONDS - state.time);
  if (state.messageLife > 0) state.messageLife -= dt;
  for (const float of state.floats) float.life -= dt;
  state.floats = state.floats.filter((float) => float.life > 0);

  // Grill: raw items cook, ready items wait, forgotten items burn.
  for (let i = 0; i < state.grill.length; i += 1) {
    const slot = state.grill[i];
    if (!slot) continue;
    slot.progress += dt;
    const ing = ingredientById(slot.ing);
    if (slot.progress > GRILL_BURN_AFTER && !slot.burnt) {
      slot.burnt = true;
      events |= EVENT_BURNT;
      state.combo = 0;
      addFloat(state, 197, 250, 'GOSONG!', '#d63c2f');
    }
    void ing;
  }

  // Orders: new tickets arrive on a quickening schedule, old ones expire.
  state.spawnIn -= dt;
  if (state.spawnIn <= 0) {
    if (spawnOrder(world)) {
      state.spawnIn = spawnIntervalAt(state.time);
    } else {
      state.spawnIn = 2;
    }
  }
  for (let i = state.orders.length - 1; i >= 0; i -= 1) {
    const order = state.orders[i];
    order.timeLeft -= dt;
    if (order.timeLeft <= 0) {
      state.orders.splice(i, 1);
      state.combo = 0;
      events |= EVENT_EXPIRED;
      addFloat(state, 640, 130, 'Pesanan hangus!', '#d63c2f');
    }
  }

  if (state.timeLeft <= 0) {
    finishShift(world);
    events |= EVENT_OVER;
  }
  return events;
}

// Click an ingredient bin: grill food goes on a free grill slot, everything
// else goes straight onto the assembly plate.
export function addFromBin(world, ingId) {
  const state = world.state;
  if (state.over) return 'over';
  const ing = ingredientById(ingId);
  if (!ing) return 'none';
  if (ing.grill) {
    for (let i = 0; i < state.grill.length; i += 1) {
      if (!state.grill[i]) {
        state.grill[i] = { ing: ingId, progress: 0, burnt: false };
        return 'grill';
      }
    }
    return 'full';
  }
  if (state.plate.length >= PLATE_SLOTS) return 'full';
  state.plate.push(ingId);
  return 'plate';
}

// Click a grill slot: collect a ready piece to the tray, or clear a burnt one.
export function collectGrill(world, index) {
  const state = world.state;
  if (state.over) return 'over';
  const slot = state.grill[index];
  if (!slot) return 'empty';
  const ing = ingredientById(slot.ing);
  if (slot.burnt) {
    state.grill[index] = null;
    return 'burnt';
  }
  if (slot.progress < ing.cookTime) return 'raw';
  if (state.tray.length >= TRAY_SLOTS) return 'trayfull';
  state.tray.push(slot.ing);
  state.grill[index] = null;
  return 'cooked';
}

// Click a cooked piece in the tray to add it to the plate.
export function addFromTray(world, index) {
  const state = world.state;
  if (state.over) return 'over';
  if (index < 0 || index >= state.tray.length) return 'none';
  if (state.plate.length >= PLATE_SLOTS) return 'full';
  state.plate.push(state.tray[index]);
  state.tray.splice(index, 1);
  return 'plate';
}

// Click a plate item to take it off again.
export function removePlateItem(world, index) {
  const state = world.state;
  if (index < 0 || index >= state.plate.length) return 'none';
  state.plate.splice(index, 1);
  return 'removed';
}

// Empty the plate into the trash.
export function trashPlate(world) {
  const state = world.state;
  if (state.plate.length === 0) return 'empty';
  state.plate = [];
  return 'trashed';
}

// Serve the plate: when it matches an open order, pay coins plus a tip for
// the time left and grow the combo; otherwise buzz and keep the plate.
export function servePlate(world) {
  const state = world.state;
  if (state.over) return { ok: false, reason: 'over' };
  if (state.plate.length === 0) return { ok: false, reason: 'empty' };
  for (let i = 0; i < state.orders.length; i += 1) {
    const order = state.orders[i];
    const dish = dishOf(order);
    if (!sameMultiset(state.plate, dish.ingredients)) continue;
    const tip = Math.round((order.timeLeft / order.total) * 6);
    const comboBonus = Math.min(state.combo, 5);
    const earned = dish.coins + tip + comboBonus;
    state.coins += earned;
    state.served += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.orders.splice(i, 1);
    state.plate = [];
    addFloat(state, 640, 300, `+${earned} koin`, '#f5b301');
    state.message = `${dish.name} tersaji! +${earned} koin`;
    state.messageLife = 1.6;
    return { ok: true, earned, dishId: dish.id };
  }
  state.combo = 0;
  state.message = 'Bukan pesanan itu — cek resepnya!';
  state.messageLife = 1.6;
  return { ok: false, reason: 'nomatch' };
}

// Grill readiness for the renderer: 'raw' | 'ready' | 'burnt' | null.
export function grillStatus(world, index) {
  const slot = world.state.grill[index];
  if (!slot) return null;
  const ing = ingredientById(slot.ing);
  if (slot.burnt) return 'burnt';
  if (slot.progress >= ing.cookTime && slot.progress <= ing.cookTime + GRILL_OK_EXTRA) return 'ready';
  if (slot.progress > ing.cookTime + GRILL_OK_EXTRA) return 'overdone';
  return 'raw';
}

// Is anything cooking on the grill right now (for the sizzle loop)?
export function grillActive(world) {
  return world.state.grill.some((slot) => slot && !slot.burnt);
}
