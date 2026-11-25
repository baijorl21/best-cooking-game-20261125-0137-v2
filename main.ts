// Warung Kilat — the hand-in program (Node 22, standard library only).
//
// The game is plain static files in game/ beside this file: game/index.html
// plus its ES modules, no build step and no network request. This program
// gathers the entry for the grader: it copies game/ and screenshots/ into the
// output directory and writes dossier.json there, the summary the judge reads,
// built with the vendored make.fun library.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's caps: the text budget shapes the dossier's bytes, and the rest
// refuse an entry the scorer would refuse (too many or too large screenshots,
// too many files or bytes under game/, or a path under game/ over 1000 bytes;
// game/ shares /output's own 1000-entry cap with screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
