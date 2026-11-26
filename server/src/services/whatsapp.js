/**
 * Envío automático de WhatsApp. Se elige con WHATSAPP_MODO en server/.env:
 *
 *  - callmebot: gratis y en 5 minutos. El número que recibe tiene que activar el bot una vez
 *    (mandarle "I allow callmebot to send me messages" al número que indica callmebot.com) y la llave que responde va en
 *    WHATSAPP_CALLMEBOT_APIKEY. Ideal cuando quien recibe eres tú o tu equipo.
 *  - meta: API oficial de WhatsApp Business (Cloud API). Necesita WHATSAPP_TOKEN y
 *    WHATSAPP_PHONE_ID; para escribir a alguien que no te ha escrito en las últimas 24 h
 *    hace falta una plantilla aprobada (WHATSAPP_PLANTILLA).
 *
 * Las llaves viven solo en server/.env, nunca en el código.
 */

const limpiar = (v) => String(v ?? '').trim().replace(/^["']|["']$/g, '');
export const modoWhatsapp = () => limpiar(process.env.WHATSAPP_MODO).toLowerCase();

let enviosPrueba = null;
/** Solo para las pruebas: guarda los mensajes en lugar de mandarlos */
export const usarWhatsappDePrueba = (arreglo) => { enviosPrueba = arreglo; };

/** ¿Está configurado el envío automático? */
export function whatsappListo() {
  if (enviosPrueba) return true;
  const modo = modoWhatsapp();
  if (modo === 'callmebot') return Boolean(limpiar(process.env.WHATSAPP_CALLMEBOT_APIKEY));
  if (modo === 'meta') return Boolean(limpiar(process.env.WHATSAPP_TOKEN) && limpiar(process.env.WHATSAPP_PHONE_ID));
  return false;
}

export function queFaltaWhatsapp() {
  const modo = modoWhatsapp();
  if (!modo) return 'Falta WHATSAPP_MODO en server/.env (callmebot o meta).';
  if (modo === 'callmebot') return 'Falta WHATSAPP_CALLMEBOT_APIKEY en server/.env.';
  if (modo === 'meta') return 'Falta WHATSAPP_TOKEN y WHATSAPP_PHONE_ID en server/.env.';
  return `WHATSAPP_MODO="${modo}" no existe: usa callmebot o meta.`;
}

/** Una sola línea con la lista (las plantillas de Meta no aceptan saltos de línea en los datos) */
const listaEnLinea = (items) => items.map((i) => `${i.cantidad} × ${i.nombre}`).join('; ');

async function pedir(url, opciones) {
  try {
    return await fetch(url, { ...opciones, signal: AbortSignal.timeout(20000) });
  } catch (error) {
    throw new Error(`No se pudo conectar con WhatsApp (${error.name === 'TimeoutError' ? 'tardó demasiado' : 'sin conexión'}).`);
  }
}

async function porCallmebot(telefono, mensaje) {
  const url = new URL('https://api.callmebot.com/whatsapp.php');
  url.searchParams.set('phone', `+${telefono}`);
  url.searchParams.set('text', mensaje);
  url.searchParams.set('apikey', limpiar(process.env.WHATSAPP_CALLMEBOT_APIKEY));
  const r = await pedir(url);
  const texto = await r.text().catch(() => '');
  // CallMeBot responde 200 aunque algo salga mal; el detalle viene en el texto
  const fallo = !r.ok || (!/queued|sent/i.test(texto) && /invalid|not (registered|activated)|error/i.test(texto));
  if (fallo) {
    throw new Error(/APIKey/i.test(texto)
      ? 'CallMeBot rechazó la llave: el número del proveedor debe ser el mismo que activó el bot y la llave la que te mandó.'
      : `CallMeBot no mandó el mensaje (respuesta ${r.status}).`);
  }
}

async function porMeta(telefono, mensaje, items, proveedor) {
  const version = limpiar(process.env.WHATSAPP_API_VERSION) || 'v24.0';
  const plantilla = limpiar(process.env.WHATSAPP_PLANTILLA);
  const cuerpo = plantilla
    ? {
      messaging_product: 'whatsapp',
      to: telefono,
      type: 'template',
      template: {
        name: plantilla,
        language: { code: limpiar(process.env.WHATSAPP_IDIOMA) || 'es_MX' },
        // La plantilla debe tener 2 variables: {{1}} proveedor y {{2}} lista de productos
        components: [{ type: 'body', parameters: [{ type: 'text', text: proveedor || 'proveedor' }, { type: 'text', text: listaEnLinea(items) }] }],
      },
    }
    : { messaging_product: 'whatsapp', to: telefono, type: 'text', text: { body: mensaje } };

  const r = await pedir(`https://graph.facebook.com/${version}/${limpiar(process.env.WHATSAPP_PHONE_ID)}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${limpiar(process.env.WHATSAPP_TOKEN)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  if (r.ok) return;
  const error = (await r.json().catch(() => null))?.error;
  const codigo = error?.code;
  const msg = codigo === 190 ? 'El token de WhatsApp (WHATSAPP_TOKEN) venció o no es válido; genera otro en Meta.'
    : codigo === 131030 ? 'Ese número no está en la lista de números de prueba de tu app de Meta.'
      : codigo === 131047 || codigo === 131026 ? 'Meta solo deja mandar texto libre si el proveedor te escribió en las últimas 24 h; usa una plantilla aprobada (WHATSAPP_PLANTILLA).'
        : codigo === 132001 ? `La plantilla "${plantilla}" no existe o no está aprobada en ese idioma.`
          : `WhatsApp (Meta) respondió con error${codigo ? ` ${codigo}` : ''}: ${error?.message || r.status}.`;
  throw new Error(msg);
}

/**
 * Manda el mensaje al número del proveedor.
 * @param {{telefono:string, mensaje:string, items:Array<{nombre:string,cantidad:number}>, proveedor?:string}} datos
 */
export async function enviarWhatsapp({ telefono, mensaje, items = [], proveedor }) {
  if (!telefono) throw new Error('Primero guarda el WhatsApp del proveedor en Ajustes de avisos.');
  if (!whatsappListo()) throw new Error(queFaltaWhatsapp());
  if (enviosPrueba) { enviosPrueba.push({ telefono, mensaje, items, proveedor }); return; }
  if (modoWhatsapp() === 'meta') return porMeta(telefono, mensaje, items, proveedor);
  return porCallmebot(telefono, mensaje);
}
