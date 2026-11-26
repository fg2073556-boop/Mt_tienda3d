import { useEffect, useMemo, useState } from 'react';

/**
 * Mapa de Puebla con los 217 municipios pintados por zona de envío.
 * Marca la tienda (Tepeaca) y, si hay destino, dibuja la ruta del paquete.
 * El contorno viene de client/public/mapas/puebla-municipios.json (INEGI, simplificado).
 *
 * @param {{datos:{tienda:object, zonas:Array, municipios:Array}, destino?:string, onElegir?:(m:object)=>void, alto?:number}} props
 */
let geoCache = null;
const cargarGeo = () => (geoCache ??= fetch('/mapas/puebla-municipios.json').then((r) => r.json()));

const ANCHO = 600;
const SIN_COBERTURA = '#d9e1df';

export default function MapaZonas({ datos, destino, onElegir, alto = 560 }) {
  const [geo, setGeo] = useState(null);
  const [encima, setEncima] = useState(null); // { m, x, y }

  useEffect(() => { cargarGeo().then(setGeo).catch(() => setGeo(false)); }, []);

  // Proyección sencilla: longitud × coseno de la latitud (suficiente para un solo estado)
  const mapa = useMemo(() => {
    if (!geo) return null;
    let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
    for (const f of geo.features) for (const poly of f.geometry.coordinates) for (const [x, y] of poly[0]) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    const k = Math.cos(((minY + maxY) / 2) * Math.PI / 180);
    const escala = ANCHO / ((maxX - minX) * k);
    const altoSvg = (maxY - minY) * escala;
    const pt = (lon, lat) => [(lon - minX) * k * escala, (maxY - lat) * escala];
    const rutas = geo.features.map((f) => ({
      cve: f.properties.cve,
      d: f.geometry.coordinates.map((poly) => poly.map((ring) => `M${ring.map(([x, y]) => pt(x, y).map((v) => v.toFixed(1)).join(',')).join('L')}Z`).join('')).join(''),
    }));
    return { rutas, pt, altoSvg };
  }, [geo]);

  if (geo === false) return <p className="text-body-secondary">No se pudo cargar el mapa.</p>;
  if (!mapa || !datos) return <div className="mapa-zonas cargando" style={{ height: alto }}>Cargando mapa…</div>;

  const porCve = new Map(datos.municipios.map((m) => [m.cve_mun, m]));
  const color = new Map(datos.zonas.map((z) => [z.id, z.color]));
  const tienda = porCve.get(datos.tienda.cve_mun);
  const dest = destino ? porCve.get(destino) : null;
  const [tx, ty] = tienda ? mapa.pt(tienda.lon, tienda.lat) : [0, 0];
  const [dx, dy] = dest ? mapa.pt(dest.lon, dest.lat) : [0, 0];
  const zonaDe = (m) => datos.zonas.find((z) => z.id === m?.zona_id);

  return (
    <div className="mapa-zonas" style={{ maxHeight: alto }}>
      <svg viewBox={`-6 -6 ${ANCHO + 12} ${mapa.altoSvg + 12}`} role="img" aria-label="Mapa de Puebla con las zonas de envío" onMouseLeave={() => setEncima(null)}>
        {mapa.rutas.map(({ cve, d }) => {
          const m = porCve.get(cve);
          const activo = cve === destino;
          return (
            <path key={cve} d={d} fill={m?.zona_id ? color.get(m.zona_id) : SIN_COBERTURA}
              className={`mapa-mun ${activo ? 'activo' : ''} ${onElegir ? 'elegible' : ''}`}
              onMouseMove={(e) => {
                const caja = e.currentTarget.ownerSVGElement.getBoundingClientRect();
                setEncima({ m, x: e.clientX - caja.left, y: e.clientY - caja.top });
              }}
              onClick={() => onElegir?.(m)}>
              <title>{m ? `${m.nombre}: ${zonaDe(m)?.nombre || 'sin cobertura'}` : cve}</title>
            </path>
          );
        })}
        {dest && tienda && dest !== tienda && (
          <g className="mapa-ruta">
            <path d={`M${tx},${ty} Q${(tx + dx) / 2},${Math.min(ty, dy) - 40} ${dx},${dy}`} />
            <circle cx={dx} cy={dy} r="6" className="mapa-destino" />
          </g>
        )}
        {tienda && (
          <g className="mapa-tienda" transform={`translate(${tx},${ty})`}>
            <circle r="9" />
            <text y="-14" textAnchor="middle">M&amp;T</text>
          </g>
        )}
      </svg>
      {encima?.m && (
        <div className="mapa-info" style={{ left: encima.x, top: encima.y }}>
          <b>{encima.m.nombre}</b>
          <span>{zonaDe(encima.m) ? `${zonaDe(encima.m).nombre} · $${zonaDe(encima.m).costo}` : 'Sin cobertura'}</span>
          <span>≈ {Math.round(encima.m.distancia_km * 1.3)} km de la tienda</span>
        </div>
      )}
    </div>
  );
}

/** Leyenda con las zonas, su costo y sus días */
export function LeyendaZonas({ datos }) {
  if (!datos) return null;
  const sin = datos.municipios.filter((m) => !m.zona_id).length;
  return (
    <ul className="leyenda-zonas">
      {datos.zonas.map((z) => (
        <li key={z.id}>
          <span className="muestra" style={{ background: z.color }} />
          <span><b>{z.nombre}</b><small>{z.municipios} municipios · {z.dias_min}–{z.dias_max} días hábiles</small></span>
          <b className="text-nowrap">{Number(z.costo) === 0 ? 'Gratis' : `$${Number(z.costo).toLocaleString('es-MX')}`}</b>
        </li>
      ))}
      <li>
        <span className="muestra" style={{ background: SIN_COBERTURA }} />
        <span><b>Sin cobertura</b><small>{sin} municipios · todavía no llegamos</small></span>
        <span className="text-body-secondary">—</span>
      </li>
    </ul>
  );
}
