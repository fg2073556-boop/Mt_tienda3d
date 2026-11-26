import { useAviso } from './Aviso.jsx';
import { dinero, fecha } from '../lib/formato.js';

const MARCAS = { visa: 'Visa', mastercard: 'Mastercard', american_express: 'American Express', amex: 'American Express', carnet: 'Carnet' };

function Copiable({ etiqueta, valor, grande }) {
  const avisar = useAviso();
  if (!valor) return null;
  const copiar = async () => {
    try { await navigator.clipboard.writeText(valor); avisar(`${etiqueta} copiada`); } catch { avisar('No se pudo copiar', 'error'); }
  };
  return (
    <div className="pago-dato">
      <span>{etiqueta}</span>
      <div className="d-flex align-items-center gap-2">
        <b className={grande ? 'pago-dato-grande' : ''}>{valor}</b>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={copiar} aria-label={`Copiar ${etiqueta}`}>Copiar</button>
      </div>
    </div>
  );
}

/**
 * Qué tiene que hacer el cliente para pagar (o el comprobante si ya pagó).
 * @param {{metodo:string, estado:string, total:number, pago?:{estado:string, datos:object}|null}} props
 */
export default function InstruccionesPago({ metodo, estado, total, pago }) {
  const d = pago?.datos;
  if (!d) {
    return metodo === 'tarjeta_prueba' ? null : (
      <div className="pago-caja">
        <b>Pago {metodo === 'tienda' ? 'en tienda' : 'por transferencia'} (modo simulado)</b>
        <p className="small mb-0">La tienda te contactará con los datos para pagar. Tu pedido queda apartado mientras tanto.</p>
      </div>
    );
  }

  if (estado === 'pagado' || pago.estado === 'completed') {
    return (
      <div className="pago-caja ok">
        <b>✓ Pago confirmado por Openpay</b>
        {d.tarjeta && (
          <p className="small mb-0">
            {MARCAS[d.tarjeta.marca] || 'Tarjeta'} terminación {d.tarjeta.ultimos4}{d.tarjeta.banco ? ` · ${d.tarjeta.banco}` : ''}
            {d.autorizacion ? ` · Autorización ${d.autorizacion}` : ''}
          </p>
        )}
      </div>
    );
  }

  if (pago.estado === 'cancelled' || pago.estado === 'failed') {
    return (
      <div className="pago-caja error">
        <b>La referencia de pago venció o fue cancelada</b>
        <p className="small mb-0">Si todavía quieres tus productos, haz la compra de nuevo o comunícate con la tienda.</p>
      </div>
    );
  }

  if (metodo === 'transferencia') {
    return (
      <div className="pago-caja">
        <b>Paga por transferencia SPEI</b>
        <ol className="small ps-3 mb-1">
          <li>Entra a la app o banca en línea de <b>cualquier banco</b>.</li>
          <li>Haz una transferencia SPEI a esta CLABE por el monto exacto.</li>
          <li>En <b>concepto o referencia</b> escribe la referencia de abajo.</li>
        </ol>
        {d.banco && <div className="pago-dato"><span>Banco destino</span><b>{d.banco}</b></div>}
        <Copiable etiqueta="CLABE" valor={d.clabe} grande />
        <Copiable etiqueta="Referencia" valor={d.referencia} />
        <div className="pago-dato"><span>Monto exacto</span><b>{dinero(total)}</b></div>
        {d.vence && <div className="pago-dato"><span>Fecha límite</span><b>{fecha(d.vence)}</b></div>}
        <p className="small text-body-secondary mb-0">Cuando Openpay reciba tu pago, tu pedido pasa a <b>Pagado</b> solo. Puedes revisarlo en "Mi pedido".</p>
      </div>
    );
  }

  return (
    <div className="pago-caja">
      <b>Paga en efectivo en tienda</b>
      <p className="small mb-1">Muestra esta referencia o el código de barras en una tienda afiliada a <b>Paynet</b> y paga el monto exacto.</p>
      <Copiable etiqueta="Referencia" valor={d.referencia} grande />
      {d.codigo_barras && <img className="pago-barras" src={d.codigo_barras} alt={`Código de barras de la referencia ${d.referencia}`} />}
      <div className="pago-dato"><span>Monto exacto</span><b>{dinero(total)}</b></div>
      {d.vence && <div className="pago-dato"><span>Fecha límite</span><b>{fecha(d.vence)}</b></div>}
      <p className="small text-body-secondary mb-0">Cuando la tienda reporte tu pago, tu pedido pasa a <b>Pagado</b> solo.</p>
    </div>
  );
}
