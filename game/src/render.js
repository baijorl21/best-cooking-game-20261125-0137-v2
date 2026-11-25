// Warung Kilat — every pixel the player sees. One job: draw the kitchen from
// the world state and record the clickable rectangles the main loop uses.
// No rules live here; the world decides what is true, this file shows it.

import { COLORS, LAYOUT, SHIFT_SECONDS, binRect } from './config.js';
import { DISHES, INGREDIENTS, dishById, ingredientById } from './recipes.js';
import { dishOf, focusOrder, grillStatus, missingForFocus } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_OVER = 'over';

const EMOJI_FONT = '"Segoe UI Emoji", "Noto Color Emoji", sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, rect, fill = COLORS.panel) {
  ctx.fillStyle = COLORS.panelEdge;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 14);
  ctx.fill();
  ctx.fillStyle = fill;
  roundRect(ctx, rect.x + 3, rect.y + 3, rect.w - 6, rect.h - 6, 11);
  ctx.fill();
}

function text(ctx, str, x, y, size, color, align = 'left', bold = true) {
  ctx.fillStyle = color;
  ctx.font = `${bold ? '700' : '400'} ${size}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function emoji(ctx, str, x, y, size) {
  ctx.font = `${size}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function timerBar(ctx, x, y, w, h, frac, urgent) {
  ctx.fillStyle = '#e8d9b8';
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  const color = urgent ? COLORS.red : frac > 0.5 ? COLORS.green : '#e67e22';
  ctx.fillStyle = color;
  if (frac > 0) {
    roundRect(ctx, x, y, Math.max(h, w * frac), h, h / 2);
    ctx.fill();
  }
}

function formatTime(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function drawKitchenShell(ctx) {
  // Warm tiled wall above, wooden floor below.
  ctx.fillStyle = COLORS.wallTop;
  ctx.fillRect(0, 0, 1280, 460);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  for (let y = 72; y < 460; y += 46) ctx.fillRect(0, y, 1280, 2);
  for (let x = 0; x < 1280; x += 92) ctx.fillRect(x, 64, 2, 396);
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 460, 1280, 260);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 500; y < 720; y += 44) ctx.fillRect(0, y, 1280, 3);
  // A striped awning along the top, like a street stall.
  for (let i = 0; i < 16; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? '#d63c2f' : '#fff3d6';
    ctx.fillRect(i * 80, 0, 80, 14);
  }
}

function drawTopBar(ctx, world) {
  const state = world.state;
  const bar = LAYOUT.topBar;
  ctx.fillStyle = '#3a2410';
  ctx.fillRect(bar.x, bar.y + 14, bar.w, bar.h - 14);
  text(ctx, '🍳 WARUNG KILAT', 24, 46, 26, '#ffd97a');
  const urgent = state.timeLeft <= 20;
  text(ctx, `⏱ ${formatTime(state.timeLeft)}`, 330, 46, 26, urgent ? '#ff8a7a' : '#ffffff');
  timerBar(ctx, 440, 34, 220, 16, state.timeLeft / SHIFT_SECONDS, urgent);
  text(ctx, `🪙 ${state.coins}`, 700, 46, 26, '#ffd97a');
  text(ctx, `🔥 x${state.combo}`, 830, 46, 24, state.combo >= 3 ? '#ff9d5c' : '#ffffff');
  text(ctx, `🍽️ ${state.served} tersaji`, 950, 46, 22, '#ffffff');
  text(ctx, 'P jeda · M suara', 1140, 46, 16, '#cbb28a', 'center', false);
}

function drawOrderBoard(ctx, world, ui) {
  const state = world.state;
  const board = LAYOUT.board;
  text(ctx, '📋 PAPAN PESANAN', board.x + 4, board.y - 12, 15, '#3a2410');
  const slotW = 400;
  for (let i = 0; i < 3; i += 1) {
    const x = board.x + i * (slotW + 24);
    const rect = { x, y: board.y, w: slotW, h: board.h };
    const order = state.orders[i];
    if (!order) {
      ctx.fillStyle = 'rgba(255,243,214,0.45)';
      roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(58,36,16,0.35)';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
      ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, 'Menunggu pelanggan…', rect.x + rect.w / 2, rect.y + rect.h / 2, 16, '#7a5a34', 'center', false);
      continue;
    }
    const dish = dishOf(order);
    const urgent = order.timeLeft <= 8;
    panel(ctx, rect, urgent ? COLORS.ticketUrgent : COLORS.ticket);
    if (urgent) {
      ctx.strokeStyle = COLORS.red;
      ctx.lineWidth = 3;
      roundRect(ctx, rect.x + 3, rect.y + 3, rect.w - 6, rect.h - 6, 11);
      ctx.stroke();
    }
    emoji(ctx, dish.emoji, rect.x + 34, rect.y + 34, 40);
    text(ctx, dish.name, rect.x + 66, rect.y + 26, 20, COLORS.ink);
    text(ctx, `+${dish.coins} koin`, rect.x + 66, rect.y + 52, 15, COLORS.softInk, 'left', false);
    let ix = rect.x + 70;
    for (const id of dish.ingredients) {
      const ing = ingredientById(id);
      emoji(ctx, ing.emoji, ix, rect.y + 80, 24);
      ix += 34;
    }
    timerBar(ctx, rect.x + 230, rect.y + 72, 140, 12, order.timeLeft / order.total, urgent);
    text(ctx, `${Math.ceil(order.timeLeft)} dtk`, rect.x + 300, rect.y + 48, 16, urgent ? COLORS.red : COLORS.ink);
  }
  void ui;
}

function drawGrill(ctx, world, ui) {
  const state = world.state;
  const rect = LAYOUT.grill;
  panel(ctx, rect);
  text(ctx, '🔥 PANGGANGAN', rect.x + 16, rect.y + 22, 18, COLORS.ink);
  text(ctx, 'Klik saat hijau!', rect.x + rect.w - 16, rect.y + 22, 13, COLORS.softInk, 'right', false);
  for (let i = 0; i < state.grill.length; i += 1) {
    const slot = state.grill[i];
    const x = rect.x + 16 + i * 156;
    const y = rect.y + 44;
    const w = 140;
    const h = 130;
    ctx.fillStyle = COLORS.grillBody;
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    // Grate lines and a flame glow while something cooks.
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 3;
    for (let g = 1; g < 4; g += 1) {
      ctx.beginPath();
      ctx.moveTo(x + 8, y + (h / 4) * g);
      ctx.lineTo(x + w - 8, y + (h / 4) * g);
      ctx.stroke();
    }
    if (slot) {
      const ing = ingredientById(slot.ing);
      const status = grillStatus(world, i);
      if (status === 'raw' || status === 'overdone') {
        ctx.fillStyle = 'rgba(255,123,47,0.55)';
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h - 14, 46, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      emoji(ctx, slot.burnt ? '🔥' : ing.emoji, x + w / 2, y + h / 2 - 8, 52);
      const frac = Math.min(1, slot.progress / 8);
      timerBar(ctx, x + 10, y + h - 26, w - 20, 12, frac, slot.burnt);
      const label = slot.burnt ? 'GOSONG — klik buang' : status === 'ready' ? 'SIAP! Klik ambil' : status === 'overdone' ? 'Cepat ambil!' : 'Memanggang…';
      text(ctx, label, x + w / 2, y + h + 22, 13, slot.burnt ? COLORS.red : COLORS.ink, 'center', false);
    } else {
      text(ctx, 'Kosong', x + w / 2, y + h / 2, 16, '#9a9aa5', 'center', false);
      text(ctx, 'Klik Patty / Ayam', x + w / 2, y + h + 22, 12, COLORS.softInk, 'center', false);
    }
    ui.hotspots.push({ x, y, w, h, action: 'grill', arg: i });
  }
  text(ctx, 'Patty 4 dtk · Ayam 5 dtk · gosong > 8 dtk', rect.x + rect.w / 2, rect.y + rect.h - 14, 13, COLORS.softInk, 'center', false);
}

function drawPlate(ctx, world, ui) {
  const state = world.state;
  const rect = LAYOUT.plate;
  panel(ctx, rect);
  text(ctx, '🍽️ PIRING RAKITAN', rect.x + 16, rect.y + 22, 18, COLORS.ink);
  const order = focusOrder(world);
  if (order) {
    const dish = dishOf(order);
    const missing = missingForFocus(world);
    const hint = missing.length === 0
      ? `Sajikan ${dish.name} sekarang!`
      : `Butuh: ${missing.map((id) => ingredientById(id).name).join(' + ')}`;
    text(ctx, hint, rect.x + rect.w - 16, rect.y + 22, 14, COLORS.softInk, 'right', false);
  }
  // The plate: a big white circle with a rim.
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + 138;
  ctx.fillStyle = '#e8e0cc';
  ctx.beginPath();
  ctx.arc(cx, cy, 104, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.plateWhite;
  ctx.beginPath();
  ctx.arc(cx, cy, 92, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d9cfae';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 92, 0, Math.PI * 2);
  ctx.stroke();
  if (state.plate.length === 0) {
    text(ctx, 'Piring kosong', cx, cy, 17, '#b0a58c', 'center', false);
    text(ctx, 'Klik bahan di bawah', cx, cy + 26, 14, '#b0a58c', 'center', false);
  } else {
    const n = state.plate.length;
    state.plate.forEach((id, i) => {
      const ing = ingredientById(id);
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(angle) * (n === 1 ? 0 : 48);
      const py = cy + Math.sin(angle) * (n === 1 ? 0 : 40);
      emoji(ctx, ing.emoji, px, py, 46);
      const hit = { x: px - 30, y: py - 30, w: 60, h: 60, action: 'plate', arg: i };
      ui.hotspots.push(hit);
    });
  }
  text(ctx, 'Klik bahan di piring untuk melepasnya', cx, rect.y + rect.h - 14, 13, COLORS.softInk, 'center', false);
}

function drawSidePanel(ctx, world, ui) {
  const state = world.state;
  const rect = LAYOUT.side;
  panel(ctx, rect);
  const serve = { x: rect.x + 16, y: rect.y + 16, w: 150, h: 64 };
  const canServe = state.plate.length > 0;
  ctx.fillStyle = canServe ? COLORS.green : '#9aa58f';
  roundRect(ctx, serve.x, serve.y, serve.w, serve.h, 12);
  ctx.fill();
  text(ctx, 'SAJIKAN', serve.x + serve.w / 2, serve.y + 24, 20, '#ffffff', 'center');
  text(ctx, 'Spasi', serve.x + serve.w / 2, serve.y + 48, 13, 'rgba(255,255,255,0.85)', 'center', false);
  ui.hotspots.push({ ...serve, action: 'serve', arg: 0 });
  const trash = { x: rect.x + 182, y: rect.y + 16, w: 132, h: 64 };
  ctx.fillStyle = state.plate.length > 0 ? COLORS.red : '#9aa58f';
  roundRect(ctx, trash.x, trash.y, trash.w, trash.h, 12);
  ctx.fill();
  text(ctx, '🗑 BUANG', trash.x + trash.w / 2, trash.y + 24, 18, '#ffffff', 'center');
  text(ctx, 'T', trash.x + trash.w / 2, trash.y + 48, 13, 'rgba(255,255,255,0.85)', 'center', false);
  ui.hotspots.push({ ...trash, action: 'trash', arg: 0 });
  text(ctx, 'NAMPAN — klik untuk ke piring', rect.x + 16, rect.y + 108, 15, COLORS.ink);
  for (let i = 0; i < 4; i += 1) {
    const x = rect.x + 16 + i * 78;
    const y = rect.y + 124;
    const slot = { x, y, w: 66, h: 66 };
    ctx.fillStyle = '#efe3c2';
    roundRect(ctx, x, y, 66, 66, 10);
    ctx.fill();
    ctx.strokeStyle = '#d9c48f';
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, 66, 66, 10);
    ctx.stroke();
    const ingId = state.tray[i];
    if (ingId) {
      emoji(ctx, ingredientById(ingId).emoji, x + 33, y + 30, 34);
      text(ctx, ingredientById(ingId).name, x + 33, y + 54, 11, COLORS.ink, 'center', false);
      ui.hotspots.push({ ...slot, action: 'tray', arg: i });
    }
  }
  if (state.message && state.messageLife > 0) {
    text(ctx, state.message, rect.x + rect.w / 2, rect.y + rect.h - 16, 15, COLORS.ink, 'center', false);
  }
}

function drawBins(ctx, world, ui) {
  const area = LAYOUT.bins;
  text(ctx, '🧺 MEJA BAHAN — klik atau tekan 1–6', area.x + 4, area.y - 12, 15, '#3a2410');
  INGREDIENTS.forEach((ing, index) => {
    const rect = binRect(index);
    const hovered = ui.mouse && ui.mouse.inside
      && ui.mouse.x >= rect.x && ui.mouse.x < rect.x + rect.w
      && ui.mouse.y >= rect.y && ui.mouse.y < rect.y + rect.h;
    ctx.fillStyle = COLORS.counterEdge;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 14);
    ctx.fill();
    ctx.fillStyle = hovered ? '#8a5a2e' : COLORS.counter;
    roundRect(ctx, rect.x + 3, rect.y + 3, rect.w - 6, rect.h - 6, 11);
    ctx.fill();
    emoji(ctx, ing.emoji, rect.x + rect.w / 2, rect.y + 62, 58);
    text(ctx, ing.name, rect.x + rect.w / 2, rect.y + 122, 20, '#ffffff', 'center');
    text(ctx, ing.grill ? '🔥 panggang dulu' : 'langsung ke piring', rect.x + rect.w / 2, rect.y + 148, 13, '#ffd97a', 'center', false);
    // Key badge in the corner.
    ctx.fillStyle = '#3a2410';
    ctx.beginPath();
    ctx.arc(rect.x + 22, rect.y + 22, 14, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, ing.key, rect.x + 22, rect.y + 23, 15, '#ffd97a', 'center');
    ui.hotspots.push({ ...rect, action: 'bin', arg: ing.id });
  });
}

function drawHints(ctx) {
  const hints = LAYOUT.hints;
  text(ctx, '1–6 bahan · Spasi sajikan · T buang piring · P jeda · M suara · R mulai lagi', hints.x + hints.w / 2, hints.y + 20, 16, '#ffe9b8', 'center', false);
}

function drawFloats(ctx, world) {
  for (const float of world.state.floats) {
    ctx.globalAlpha = Math.min(1, float.life);
    text(ctx, float.text, float.x, float.y - (1.4 - float.life) * 40, 24, float.color, 'center');
  }
  ctx.globalAlpha = 1;
}

function overlay(ctx, alpha) {
  ctx.fillStyle = `rgba(20,12,4,${alpha})`;
  ctx.fillRect(0, 0, 1280, 720);
}

function drawTitle(ctx, world) {
  overlay(ctx, 0.55);
  const rect = { x: 290, y: 110, w: 700, h: 500 };
  panel(ctx, rect);
  text(ctx, '🍳', rect.x + rect.w / 2, rect.y + 62, 64, COLORS.ink, 'center');
  text(ctx, 'WARUNG KILAT', rect.x + rect.w / 2, rect.y + 132, 46, COLORS.ink, 'center');
  text(ctx, 'Dapur jalanan paling cepat di kota!', rect.x + rect.w / 2, rect.y + 172, 18, COLORS.softInk, 'center', false);
  const lines = [
    '1. Baca pesanan di papan atas.',
    '2. Klik bahan — Patty & Ayam harus dipanggang dulu.',
    '3. Ambil dari panggangan saat hijau, rakit di piring.',
    '4. Sajikan sebelum waktu pesanan habis. Tip makin besar!',
    '5. Gosong atau salah rakit? Buang, lalu mulai lagi.',
  ];
  lines.forEach((line, i) => {
    text(ctx, line, rect.x + 48, rect.y + 224 + i * 32, 17, COLORS.ink, 'left', false);
  });
  text(ctx, 'Shift 2 menit · makin lama makin ramai', rect.x + rect.w / 2, rect.y + 404, 16, COLORS.softInk, 'center', false);
  ctx.fillStyle = COLORS.green;
  roundRect(ctx, rect.x + 220, rect.y + 428, 260, 52, 12);
  ctx.fill();
  text(ctx, '▶  MULAI MASAK', rect.x + 350, rect.y + 455, 22, '#ffffff', 'center');
  text(ctx, 'atau tekan Enter', rect.x + rect.w / 2, rect.y + 494, 13, COLORS.softInk, 'center', false);
}

function drawPause(ctx) {
  overlay(ctx, 0.5);
  text(ctx, '⏸ JEDA', 640, 330, 54, '#ffffff', 'center');
  text(ctx, 'Tekan P untuk lanjut masak', 640, 390, 20, '#ffe9b8', 'center', false);
}

function drawOver(ctx, world) {
  const state = world.state;
  overlay(ctx, 0.6);
  const rect = { x: 340, y: 130, w: 600, h: 460 };
  panel(ctx, rect);
  text(ctx, '🏁 SHIFT SELESAI!', rect.x + rect.w / 2, rect.y + 52, 36, COLORS.ink, 'center');
  const stars = '★★★'.slice(0, state.stars) + '☆☆☆'.slice(0, 3 - state.stars);
  text(ctx, stars, rect.x + rect.w / 2, rect.y + 112, 44, COLORS.gold, 'center');
  const rows = [
    ['🪙 Koin', `${state.coins}`],
    ['🍽️ Hidangan tersaji', `${state.served}`],
    ['🔥 Kombo terbaik', `x${state.bestCombo}`],
  ];
  rows.forEach(([label, value], i) => {
    const y = rect.y + 182 + i * 48;
    text(ctx, label, rect.x + 60, y, 22, COLORS.ink, 'left', false);
    text(ctx, value, rect.x + rect.w - 60, y, 26, COLORS.ink, 'right');
  });
  const verdict = state.stars === 3 ? 'Koki legendaris! 👑' : state.stars === 2 ? 'Dapur panas, kerja bagus!' : state.stars === 1 ? 'Lumayan — latihan lagi yuk!' : 'Shift berat… coba lagi!';
  text(ctx, verdict, rect.x + rect.w / 2, rect.y + 350, 20, COLORS.softInk, 'center', false);
  ctx.fillStyle = COLORS.green;
  roundRect(ctx, rect.x + 170, rect.y + 382, 260, 52, 12);
  ctx.fill();
  text(ctx, '↻  MAIN LAGI (R)', rect.x + 300, rect.y + 409, 22, '#ffffff', 'center');
}

function drawRecipeStrip(ctx) {
  // A quiet reminder of the four dishes along the very bottom edge.
  const y = 706;
  const parts = DISHES.map((dish) => `${dish.emoji} ${dish.name}: ${dish.ingredients.map((id) => ingredientById(id).name).join('+')}`).join('    ·    ');
  text(ctx, parts, 640, y, 13, '#ffe9b8', 'center', false);
}

// Draw one frame. `ui` carries the mouse position and receives this frame's
// hotspots; `screen` picks which overlay, if any, sits on top.
export function drawGame(ctx, world, screen, ui) {
  ui.hotspots.length = 0;
  drawKitchenShell(ctx);
  drawTopBar(ctx, world);
  drawOrderBoard(ctx, world, ui);
  drawGrill(ctx, world, ui);
  drawPlate(ctx, world, ui);
  drawSidePanel(ctx, world, ui);
  drawBins(ctx, world, ui);
  drawHints(ctx);
  drawFloats(ctx, world);
  if (screen === SCREEN_TITLE) drawTitle(ctx, world);
  if (screen === SCREEN_PAUSE) drawPause(ctx);
  if (screen === SCREEN_OVER) drawOver(ctx, world);
  drawRecipeStrip(ctx);
}
