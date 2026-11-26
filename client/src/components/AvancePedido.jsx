import { ESTADOS } from '../lib/formato.js';

const Trazo = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

const PASOS = [
  { clave: 'pagado', icono: <Trazo><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h3" /></Trazo> },
  { clave: 'preparacion', icono: <Trazo><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" /></Trazo> },
  { clave: 'enviado', icono: <Trazo><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17.5" cy="17.5" r="1.8" /></Trazo> },
  { clave: 'entregado', icono: <Trazo><path d="m3 11 9-7 9 7" /><path d="M5 10v10h14V10" /><path d="m9 15 2 2 4-4" /></Trazo> },
];

const MENSAJES = {
  pendiente: 'Estamos esperando tu pago. En cuanto se confirme, empezamos a preparar tu pedido.',
  pagado: 'Recibimos tu pago. Muy pronto empezamos a preparar tu pedido.',
  preparacion: 'Estamos revisando y empacando tus productos en nuestra tienda de Tepeaca.',
  enviado: 'Tu paquete ya va en camino. Ten a la mano una identificación para recibirlo.',
  entregado: 'Tu pedido fue entregado. ¡Gracias por comprar en M&T!',
};

export const mensajeDeEstado = (estado) => MENSAJES[estado] || '';

/** Barra de avance de un pedido: pago → preparación → envío → entrega */
export default function AvancePedido({ estado }) {
  if (estado === 'cancelado') return null;
  const pendiente = estado === 'pendiente';
  // "Pendiente" se dibuja en el primer paso, pero sin marcarlo como hecho
  const actual = pendiente ? 0 : PASOS.findIndex((p) => p.clave === estado);

  return (
    <ol className="avance" aria-label="Avance del pedido">
      {PASOS.map((p, i) => {
        const clase = i < actual || (i === actual && !pendiente) ? 'hecho' : '';
        const esActual = i === actual;
        return (
          <li key={p.clave} className={`${clase} ${esActual ? 'actual' : ''} ${esActual && pendiente ? 'espera' : ''}`} aria-current={esActual ? 'step' : undefined}>
            <span className="avance-icono">{p.icono}</span>
            <span className="avance-texto">{p.clave === 'pagado' && pendiente ? 'Pendiente de pago' : ESTADOS[p.clave]}</span>
          </li>
        );
      })}
    </ol>
  );
}
