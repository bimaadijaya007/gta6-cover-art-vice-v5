// Sunset Vice Atelier — entrypoint.
// Copies app/ and screenshots/ into the output directory and writes
// dossier.json with buildDossier from vendor/makefun-app.ts.
// Node 22, standard library only, no network, no writes outside the output dir.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
if (outDir === repoRoot) throw new Error('MAKEFUN_OUTPUT_DIR must not be the repository root');

try {
  // Preflight: fail fast with a clear message instead of a half-written output.
  const indexHtml = join(repoRoot, 'app', 'index.html');
  const shotsDir = join(repoRoot, 'screenshots');
  if (!existsSync(indexHtml)) throw new Error('app/index.html is missing');
  if (!existsSync(shotsDir)) throw new Error('screenshots/ is missing');
  mkdirSync(outDir, { recursive: true });
  rmSync(join(outDir, 'dossier.json'), { force: true });
  for (const name of ['app', 'screenshots']) {
    const target = join(outDir, name);
    rmSync(target, { recursive: true, force: true });
    cpSync(join(repoRoot, name), target, { recursive: true });
  }
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  if (!existsSync(join(outDir, 'dossier.json'))) throw new Error('dossier.json was not written');
  console.log(`Sunset Vice Atelier: wrote ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
} catch (err) {
  console.error(`Sunset Vice Atelier: failed: ${(err as Error).message}`);
  process.exit(1);
}
