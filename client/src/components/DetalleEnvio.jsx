import { dinero } from '../lib/formato.js';

/** Resumen del envío de un pedido (respuesta de la compra o del seguimiento) */
export default function DetalleEnvio({ envio }) {
  if (!envio?.municipio) {
    return <p className="small text-body-secondary mb-0">Entrega digital: las licencias llegan a tu correo.</p>;
  }
  return (
    <div className="envio-pedido">
      <span className="envio-pedido-icono" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17.5" cy="17.5" r="1.8" /></svg>
      </span>
      <span>
        <b>Envío a {envio.colonia}, {envio.municipio}</b>
        <small className="d-block text-body-secondary">
          CP {envio.cp} · {envio.zona} · {envio.dias} días hábiles · Tepeaca → {envio.municipio} ≈ {Math.round(envio.km)} km
        </small>
      </span>
      <b className="ms-auto text-nowrap">{Number(envio.costo) === 0 ? 'Gratis' : dinero(envio.costo)}</b>
    </div>
  );
}

/** Convierte las columnas envio_* del pedido al formato de DetalleEnvio */
export const envioDePedido = (p) => (p?.envio_municipio ? {
  cp: p.envio_cp, colonia: p.envio_colonia, municipio: p.envio_municipio, zona: p.envio_zona,
  km: Number(p.envio_km), dias: p.envio_dias, costo: Number(p.envio_costo),
} : null);
