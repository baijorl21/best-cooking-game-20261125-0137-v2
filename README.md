# Warung Kilat 🍳

A fast-paced Indonesian street-kitchen cooking game. Customers order from a
four-dish recipe book, you grill the meat, build each dish on the assembly
plate, and serve it before the order timer runs out. One shift lasts 2
minutes — the faster you serve, the bigger the tip, and a serving streak
builds a combo bonus. Orders arrive quicker and expire sooner as the shift
goes on.

## How to play

1. Read the order tickets on the board at the top.
2. Click an ingredient bin (or press **1–6**). Patty and Ayam go on the grill
   first; everything else goes straight onto the plate.
3. Click a grill slot when its bar turns green to collect the cooked piece
   into the tray, then click the tray piece to add it to the plate. Leave it
   too long and it burns — click the burnt slot to throw it away.
4. When the plate matches an open order, press **Sajikan** (or **Space**).
   Correct serve: coins + a tip for the time left. Wrong plate: buzz, combo
   resets. Click a plate item to take it off, or **T** to trash the plate.
5. When the 2-minute shift ends, the results screen shows coins earned,
   dishes served, best combo, and a 1–3 star rating. Press **R** to play again.

## Dishes

| Dish | Recipe | Coins |
| --- | --- | --- |
| Burger Kilat 🍔 | Roti + Patty + Saus | 12 |
| Nasi Goreng Kilat 🍛 | Nasi + Ayam + Saus | 14 |
| Mie Ayam Kilat 🍜 | Mie + Ayam | 11 |
| Sandwich Kilat 🥪 | Roti + Ayam + Saus | 13 |

## Controls

- Mouse: click bins, grill slots, tray, plate, Serve / Trash buttons.
- **1–6**: ingredient bins · **Space**: serve · **T**: trash plate ·
  **P**: pause · **M**: mute · **Enter**: start · **R**: restart.

## Run locally

```sh
node serve.ts
# open http://localhost:8080
```

Screenshot scenes (deterministic, seeded):

```sh
http://localhost:8080/?shot=start&seed=1
http://localhost:8080/?shot=play&seed=1
http://localhost:8080/?shot=end&seed=1
```

## Tech

Plain static files under `game/` — vanilla canvas 2D and WebAudio sounds
synthesized in code. No build step, no network requests, no external
libraries. The source is split by job: `config.js` (layout and tuning),
`random.js` (seeded RNG), `audio.js` (synth sounds), `input.js`
(mouse + keyboard), `recipes.js` (dishes and ingredients), `world.js`
(rules: orders, grill, scoring), `render.js` (all canvas drawing),
`shots.js` (screenshot scene staging), `main.js` (loop and screens).
