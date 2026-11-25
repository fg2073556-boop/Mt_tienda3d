/**
 * Prepara los archivos .env la primera vez:  npm run preparar
 *
 * - Crea .env (raíz, para Docker) y server/.env (para la API) a partir de los .env.example
 * - Genera contraseñas aleatorias y pone LA MISMA contraseña de la base en los dos archivos
 * - Si algún .env ya existe, no lo toca (para no perder tus cambios)
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rutaRaiz = path.join(raiz, '.env');
const rutaServer = path.join(raiz, 'server', '.env');
const azar = (n) => crypto.randomBytes(n).toString('base64url');

const existeRaiz = fs.existsSync(rutaRaiz);
const existeServer = fs.existsSync(rutaServer);
if (existeRaiz && existeServer) {
  console.log('Los dos archivos .env ya existen; no cambié nada.');
  console.log('Si quieres empezar de cero, bórralos y vuelve a correr: npm run preparar');
  process.exit(0);
}

const leerValor = (texto, clave) => texto.match(new RegExp(`^${clave}=(.*)$`, 'm'))?.[1]?.trim();
const poner = (texto, clave, valor) => texto.replace(new RegExp(`^${clave}=.*$`, 'm'), `${clave}=${valor}`);

// Si ya existe uno de los dos, se respeta su contraseña para que coincidan
let passBD = azar(18);
if (existeRaiz) passBD = leerValor(fs.readFileSync(rutaRaiz, 'utf8'), 'POSTGRES_PASSWORD') || passBD;
if (existeServer) passBD = leerValor(fs.readFileSync(rutaServer, 'utf8'), 'DB_PASSWORD') || passBD;

if (!existeRaiz) {
  let t = fs.readFileSync(path.join(raiz, '.env.example'), 'utf8');
  t = poner(t, 'POSTGRES_PASSWORD', passBD);
  fs.writeFileSync(rutaRaiz, t);
  console.log('Creado .env (base de datos de Docker)');
}

if (!existeServer) {
  const passAdmin = azar(9);
  const passVende = azar(9);
  let t = fs.readFileSync(path.join(raiz, 'server', '.env.example'), 'utf8');
  t = poner(t, 'DB_PASSWORD', passBD);
  t = poner(t, 'JWT_SECRET', azar(32));
  t = poner(t, 'ADMIN_PASSWORD', passAdmin);
  t = poner(t, 'SELLER_PASSWORD', passVende);
  fs.writeFileSync(rutaServer, t);
  console.log('Creado server/.env (API)');
  console.log('');
  console.log('Cuentas del panel (se crean con: npm run crear-usuarios):');
  console.log(`  Administrador: ${leerValor(t, 'ADMIN_EMAIL')}  contraseña: ${passAdmin}`);
  console.log(`  Vendedor:      ${leerValor(t, 'SELLER_EMAIL')}  contraseña: ${passVende}`);
  console.log('  (quedan guardadas en server/.env por si las olvidas)');
}

console.log('');
console.log('Siguiente paso: npm run bd');
