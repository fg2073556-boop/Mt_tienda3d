/**
 * Cobros con Openpay (https://www.openpay.mx). Tres formas:
 *  - tarjeta: el navegador convierte la tarjeta en un token con Openpay.js y aquí solo se cobra
 *    ese token. Los datos de la tarjeta NUNCA llegan a este servidor.
 *  - transferencia: Openpay da una CLABE y una referencia para pagar por SPEI desde cualquier banco.
 *  - tienda: Openpay da una referencia y un código de barras para pagar en efectivo.
 *
 * Llaves en server/.env: OPENPAY_MERCHANT_ID, OPENPAY_PUBLIC_KEY (pk_…), OPENPAY_PRIVATE_KEY (sk_…).
 * Mientras OPENPAY_PRODUCCION no sea "true" se usa el sandbox (pruebas, sin dinero real).
 */

const limpiar = (v) => String(v ?? '').trim().replace(/^["']|["']$/g, '');
const merchantId = () => limpiar(process.env.OPENPAY_MERCHANT_ID);
const llavePrivada = () => limpiar(process.env.OPENPAY_PRIVATE_KEY);
const llavePublica = () => limpiar(process.env.OPENPAY_PUBLIC_KEY);
export const enProduccion = () => limpiar(process.env.OPENPAY_PRODUCCION).toLowerCase() === 'true';

/** ¿Están las tres llaves? */
export const openpayListo = () => Boolean(merchantId() && llavePrivada() && llavePublica());

/** Lo que el navegador necesita (la llave pública está hecha para mostrarse) */
export const configPublica = () => (openpayListo()
  ? { activo: true, merchantId: merchantId(), publicKey: llavePublica(), sandbox: !enProduccion() }
  : { activo: false });

const base = () => `https://${enProduccion() ? 'api' : 'sandbox-api'}.openpay.mx/v1/${merchantId()}`;

export class ErrorPago extends Error {
  constructor(mensaje, { status = 402, codigo } = {}) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
  }
}

// Códigos de error de Openpay → mensaje para el cliente
const MENSAJES = {
  1001: 'Los datos del pago no son válidos. Revísalos e intenta de nuevo.',
  1006: 'Este pedido ya tiene un pago registrado.',
  2004: 'El número de tarjeta no es válido.',
  2005: 'La tarjeta ya venció.',
  2006: 'Falta el código de seguridad (CVV) de la tarjeta.',
  2009: 'El código de seguridad (CVV) no es válido.',
  2010: 'La tarjeta necesita verificación 3D Secure.',
  2011: 'Ese tipo de tarjeta no se acepta.',
  3001: 'Tu banco rechazó la tarjeta. Prueba con otra o comunícate con tu banco.',
  3002: 'La tarjeta ya venció.',
  3003: 'La tarjeta no tiene fondos suficientes.',
  3004: 'La tarjeta fue reportada como robada.',
  3005: 'El sistema antifraude rechazó el pago. Prueba con otra tarjeta.',
  3006: 'Esa operación no está permitida para esta tarjeta.',
  3008: 'La tarjeta no acepta compras en línea.',
  3009: 'La tarjeta fue reportada como perdida.',
  3010: 'El banco restringió la tarjeta.',
  3011: 'El banco pidió retener la tarjeta. Comunícate con tu banco.',
  3012: 'Tu banco pide autorizar este pago. Comunícate con tu banco.',
};

async function llamar(metodo, ruta, cuerpo) {
  const auth = Buffer.from(`${llavePrivada()}:`).toString('base64');
  let r;
  try {
    r = await fetch(`${base()}${ruta}`, {
      method: metodo,
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    throw new ErrorPago(`No se pudo conectar con Openpay (${error.name === 'TimeoutError' ? 'tardó demasiado' : 'sin conexión'}). No se hizo ningún cargo.`, { status: 502 });
  }
  const datos = await r.json().catch(() => null);
  if (r.ok) return datos;
  const codigo = datos?.error_code;
  if (r.status === 401) {
    console.warn('Openpay rechazó las llaves:', datos?.description);
    throw new ErrorPago('La tienda no pudo conectarse con el banco. Intenta más tarde o elige otra forma de pago.', { status: 502, codigo });
  }
  console.warn('Openpay respondió', r.status, codigo, datos?.description);
  throw new ErrorPago(MENSAJES[codigo] || 'No se pudo procesar el pago. Intenta de nuevo o elige otra forma de pago.', { status: r.status === 402 ? 402 : 422, codigo });
}

/** Separa "Ana María López Pérez" en nombre y apellidos para Openpay */
function cliente({ nombre, correo, telefono }) {
  const partes = nombre.trim().split(/\s+/);
  const apellidos = partes.length > 2 ? partes.slice(-2) : partes.slice(1);
  const nombres = partes.slice(0, partes.length - apellidos.length);
  const tel = String(telefono || '').replace(/\D/g, '').slice(-10);
  return {
    name: nombres.join(' ').slice(0, 100) || partes[0],
    last_name: apellidos.join(' ').slice(0, 100) || undefined,
    email: correo,
    ...(tel.length === 10 && { phone_number: tel }),
  };
}

/** Lo que guardamos del cargo (nunca el número completo de la tarjeta) */
export function datosDelCargo(cargo) {
  const pm = cargo.payment_method || {};
  const d = { vence: cargo.due_date || null };
  if (cargo.method === 'card' && cargo.card) {
    d.tarjeta = {
      marca: cargo.card.brand || null,
      ultimos4: String(cargo.card.card_number || '').slice(-4) || null,
      banco: cargo.card.bank_name || null,
      tipo: cargo.card.type || null,
    };
    d.autorizacion = cargo.authorization || null;
  }
  if (pm.type === 'bank_transfer') Object.assign(d, { banco: pm.bank || null, clabe: pm.clabe || null, referencia: pm.name || null, convenio: pm.agreement || null });
  if (pm.type === 'store') Object.assign(d, { referencia: pm.reference || null, codigo_barras: pm.barcode_url || null });
  if (pm.url) d.url_3ds = pm.url;
  return d;
}

/**
 * Crea el cargo en Openpay.
 * @param {{metodo:'tarjeta'|'transferencia'|'tienda', monto:number, folio:string, descripcion:string,
 *          comprador:{nombre:string, correo:string, telefono?:string}, token?:string, dispositivo?:string}} p
 */
export async function crearCargo({ metodo, monto, folio, descripcion, comprador, token, dispositivo }) {
  const comun = {
    amount: Math.round(monto * 100) / 100,
    currency: 'MXN',
    description: descripcion.slice(0, 250),
    // order_id debe ser único en toda la cuenta de Openpay: el folio más un sufijo por si se reinicia la base
    order_id: `${folio}-${Date.now().toString(36)}`,
    customer: cliente(comprador),
  };
  let cuerpo;
  if (metodo === 'tarjeta') {
    if (!token || !dispositivo) throw new ErrorPago('Faltan los datos de la tarjeta. Vuelve a escribirlos.', { status: 422 });
    cuerpo = { ...comun, method: 'card', source_id: token, device_session_id: dispositivo };
  } else if (metodo === 'transferencia') {
    cuerpo = { ...comun, method: 'bank_account' };
  } else if (metodo === 'tienda') {
    cuerpo = { ...comun, method: 'store' };
  } else {
    throw new ErrorPago('Forma de pago no válida.', { status: 422 });
  }
  const cargo = await llamar('POST', '/charges', cuerpo);
  return { id: cargo.id, estado: cargo.status, pagado: cargo.status === 'completed', datos: datosDelCargo(cargo) };
}

/** Consulta un cargo (para el webhook y la revisión de pagos pendientes) */
export async function consultarCargo(id) {
  if (!/^[a-z0-9]{10,40}$/i.test(id)) throw new ErrorPago('Identificador de pago no válido.', { status: 422 });
  const cargo = await llamar('GET', `/charges/${id}`);
  return { id: cargo.id, estado: cargo.status, pagado: cargo.status === 'completed', datos: datosDelCargo(cargo), fecha: cargo.operation_date };
}
