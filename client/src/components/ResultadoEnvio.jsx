import { Link } from 'react-router-dom';
import { dias } from '../lib/envios.js';
import { dinero } from '../lib/formato.js';

/** Tarjeta con lo que dice la cotización: zona, costo, días y ruta, o por qué no llegamos */
export default function ResultadoEnvio({ datos, conEnlace = true }) {
  if (!datos) return null;
  if (!datos.cubre) {
    return (
      <div className="envio-resultado no" role="status">
        <b>{datos.motivo === 'sin_cobertura' ? `Todavía no llegamos a ${datos.municipio}` : 'No podemos enviar a ese código postal'}</b>
        <span>{datos.mensaje}</span>
        {conEnlace && <Link to="/envios">Ver las zonas a las que sí llegamos</Link>}
      </div>
    );
  }
  const z = datos.zona;
  return (
    <div className="envio-resultado si" role="status" style={{ '--zona': z.color }}>
      <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
        <span><b>{datos.municipio}, Puebla</b><small className="d-block">CP {datos.cp}</small></span>
        <span className="envio-zona">{z.nombre}</span>
      </div>
      <div className="envio-cifras">
        <span><small>Costo de envío</small><b>{z.costo === 0 ? 'Gratis' : dinero(z.costo)}</b></span>
        <span><small>Llega en</small><b>{dias(z)}</b></span>
        <span><small>Ruta</small><b>{datos.ruta.origen} → {datos.ruta.destino}</b><small>≈ {datos.ruta.km_aprox} km</small></span>
      </div>
    </div>
  );
}
