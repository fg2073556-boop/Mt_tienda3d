/**
 * Se corre solo antes de `npm run dev`: si después de un `git pull` alguien agregó
 * una librería nueva (por ejemplo nodemailer), la instala para que el servidor no truene.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

for (const carpeta of ['server', 'client']) {
  const pkg = JSON.parse(fs.readFileSync(path.join(carpeta, 'package.json'), 'utf8'));
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  const faltan = deps.filter((d) => !fs.existsSync(path.join(carpeta, 'node_modules', d, 'package.json')));
  if (!faltan.length) continue;
  console.log(`Instalando lo que falta en ${carpeta}: ${faltan.join(', ')}…`);
  execSync('npm install', { cwd: carpeta, stdio: 'inherit' });
}
