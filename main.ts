// Sunset Vice Atelier — gta6-cover-art-01 entry (Node 22, standard library only).
// Copies app/ and screenshots/ beside this file into the output dir and writes
// dossier.json via the vendored make.fun library. No network, no writes outside
// the output dir. Usage: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

try {
  if (!existsSync(join(here, 'app', 'index.html'))) {
    throw new Error('app/index.html is missing — nothing to hand in');
  }
  mkdirSync(out, { recursive: true });
  rmSync(join(out, 'app'), { recursive: true, force: true });
  rmSync(join(out, 'screenshots'), { recursive: true, force: true });
  cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
  if (existsSync(join(here, 'screenshots'))) {
    cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
  } else {
    mkdirSync(join(out, 'screenshots'), { recursive: true });
  }
  const dossierPath = join(out, 'dossier.json');
  writeFileSync(
    dossierPath,
    buildDossier(out, {
      text_max_bytes: 163840,
      screenshots: { max: 4, max_bytes: 262144 },
      app_max_files: 993,
      app_max_bytes: 50331648,
      app_path_max_bytes: 1000,
    }),
  );
  const bytes = statSync(dossierPath).size;
  if (bytes === 0) throw new Error('dossier.json came out empty');
  console.log(`Sunset Vice Atelier dossier written to ${dossierPath} (${bytes} bytes)`);
} catch (err) {
  console.error(`main.ts failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
