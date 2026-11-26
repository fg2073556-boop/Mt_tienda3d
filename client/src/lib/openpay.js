/**
 * Openpay.js en el navegador (copia del repositorio open-pay/openpay-js en public/openpay).
 * La tarjeta se convierte en un token directamente con Openpay: el número y el CVV
 * nunca se mandan al servidor de la tienda.
 */

const cargarScript = (src) => new Promise((resolve, reject) => {
  const ya = document.querySelector(`script[src="${src}"]`);
  if (ya?.dataset.listo) return resolve();
  const s = ya || document.createElement('script');
  s.src = src;
  s.async = true;
  s.addEventListener('load', () => { s.dataset.listo = '1'; resolve(); }, { once: true });
  s.addEventListener('error', () => reject(new Error('No se pudo cargar Openpay. Revisa tu conexión.')), { once: true });
  if (!ya) document.head.append(s);
});

let listo = null;

/**
 * Carga Openpay.js con las llaves públicas y genera el identificador antifraude.
 * @param {{merchantId:string, publicKey:string, sandbox:boolean}} config  de GET /api/pagos/config
 */
export function prepararOpenpay(config) {
  if (!listo) {
    listo = (async () => {
      await cargarScript('/openpay/openpay.v1.min.js');
      await cargarScript('/openpay/openpay-data.v1.min.js');
      const { OpenPay } = window;
      OpenPay.setId(config.merchantId);
      OpenPay.setApiKey(config.publicKey);
      OpenPay.setSandboxMode(Boolean(config.sandbox));
      const deviceSessionId = OpenPay.deviceData.setup();
      return { OpenPay, deviceSessionId };
    })().catch((e) => { listo = null; throw e; });
  }
  return listo;
}

export const soloDigitos = (v) => String(v || '').replace(/\D/g, '');

/** "4111111111111111" → "4111 1111 1111 1111" (American Express: 4-6-5) */
export function formatearNumero(v) {
  const d = soloDigitos(v).slice(0, 16);
  if (/^3[47]/.test(d)) return [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(' ');
  return d.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function marcaDe(numero) {
  const d = soloDigitos(numero);
  if (/^4/.test(d)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'mastercard';
  if (/^3[47]/.test(d)) return 'amex';
  return null;
}

// Errores de Openpay al crear el token → mensaje claro
const ERRORES = {
  1001: 'Revisa los datos de la tarjeta.',
  2004: 'El número de tarjeta no es válido.',
  2005: 'La tarjeta ya venció.',
  2006: 'Falta el código de seguridad (CVV).',
  2007: 'Ese número de tarjeta solo sirve en pruebas.',
  2008: 'Esa tarjeta no se puede usar para este pago.',
  2009: 'El código de seguridad (CVV) no es válido.',
  2011: 'Ese tipo de tarjeta no se acepta.',
};

/**
 * Valida y convierte la tarjeta en token.
 * @returns {Promise<{token:string, deviceSessionId:string}>}
 */
export async function tokenizar(config, tarjeta) {
  const { OpenPay, deviceSessionId } = await prepararOpenpay(config);
  const numero = soloDigitos(tarjeta.numero);
  const [mes = '', anio = ''] = String(tarjeta.vence).split('/').map((x) => soloDigitos(x));
  const cvv = soloDigitos(tarjeta.cvv);

  if (!tarjeta.titular.trim()) throw new Error('Escribe el nombre como aparece en la tarjeta.');
  if (!OpenPay.card.validateCardNumber(numero)) throw new Error('El número de tarjeta no es válido.');
  if (!OpenPay.card.validateExpiry(mes, anio)) throw new Error('Revisa la fecha de vencimiento (MM/AA).');
  if (!OpenPay.card.validateCVC(cvv, numero)) throw new Error('Revisa el código de seguridad (CVV).');

  const token = await new Promise((resolve, reject) => {
    OpenPay.token.create(
      { card_number: numero, holder_name: tarjeta.titular.trim(), expiration_month: mes.padStart(2, '0'), expiration_year: anio.slice(-2), cvv2: cvv },
      (r) => resolve(r.data.id),
      (e) => reject(new Error(ERRORES[e?.data?.error_code] || (e?.status === 0
        ? 'No hay conexión con Openpay. Revisa tu internet.'
        : 'Openpay no aceptó la tarjeta. Revisa los datos.'))),
    );
  });
  return { token, deviceSessionId };
}
