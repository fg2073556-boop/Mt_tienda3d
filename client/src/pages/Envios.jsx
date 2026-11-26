import { useEffect, useMemo, useState } from 'react';
import MapaZonas, { LeyendaZonas } from '../components/MapaZonas.jsx';
import ResultadoEnvio from '../components/ResultadoEnvio.jsx';
import { api } from '../lib/api.js';
import { useCotizacion } from '../lib/envios.js';

/** Zonas de envío: a qué municipios de Puebla llegamos, cuánto cuesta y cuánto tarda */
export default function Envios() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [cp, setCp] = useState('');
  const [buscar, setBuscar] = useState('');
  const [elegido, setElegido] = useState(null);
  const cotizacion = useCotizacion(cp);

  useEffect(() => { api('/envios/zonas').then(setDatos).catch((e) => setError(e.message)); }, []);

  const destino = cotizacion.datos?.cve_mun || elegido?.cve_mun;
  const porZona = useMemo(() => {
    if (!datos) return [];
    const t = buscar.trim().toLowerCase();
    const lista = datos.municipios.filter((m) => !t || m.nombre.toLowerCase().includes(t));
    return [...datos.zonas.map((z) => ({ zona: z, municipios: lista.filter((m) => m.zona_id === z.id) })),
      { zona: null, municipios: lista.filter((m) => !m.zona_id) }];
  }, [datos, buscar]);

  return (
    <section className="banda">
      <div className="contenedor">
        <div className="envios-cabeza">
          <div>
            <h1 className="mb-2">Envíos en Puebla</h1>
            <p className="text-body-secondary mb-0" style={{ maxWidth: '60ch' }}>
              Tus compras salen de nuestra tienda en <b>Tepeaca</b>. Mientras más cerca estés, más rápido y barato llega.
              Las licencias de software llegan por correo y no pagan envío.
            </p>
          </div>
          <label className="envios-cp">
            <span>¿Llegamos a tu casa?</span>
            <input className="form-control form-control-lg" inputMode="numeric" maxLength={5} placeholder="Tu código postal"
              value={cp} onChange={(e) => setCp(e.target.value.replace(/\D/g, '').slice(0, 5))} />
          </label>
        </div>

        {(cotizacion.datos || cotizacion.cargando) && (
          <div className="mt-3" style={{ maxWidth: 720 }}>
            {cotizacion.cargando ? <p className="text-body-secondary">Buscando…</p> : <ResultadoEnvio datos={cotizacion.datos} conEnlace={false} />}
          </div>
        )}
        {error && <div className="alert alert-danger mt-3">{error}</div>}

        <div className="envios-rejilla">
          <div className="card card-body">
            <MapaZonas datos={datos} destino={destino} onElegir={(m) => { setElegido(m); setCp(''); }} />
            <p className="small text-body-secondary mb-0 mt-2">Toca un municipio para ver su ruta. Límites municipales: INEGI. Códigos postales: SEPOMEX.</p>
          </div>
          <aside className="d-flex flex-column gap-3">
            <div className="card card-body">
              <h2 className="h5">Zonas</h2>
              <LeyendaZonas datos={datos} />
            </div>
            {elegido && !cotizacion.datos && (
              <div className="card card-body">
                <b>{elegido.nombre}</b>
                <span className="text-body-secondary small">
                  {datos.zonas.find((z) => z.id === elegido.zona_id)?.nombre || 'Sin cobertura'} · ≈ {Math.round(elegido.distancia_km * 1.3)} km desde Tepeaca
                </span>
              </div>
            )}
          </aside>
        </div>

        <div className="card card-body mt-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
            <h2 className="h5 mb-0">Municipios por zona</h2>
            <input type="search" className="form-control" style={{ maxWidth: 280 }} placeholder="Buscar municipio" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          </div>
          <div className="envios-listas">
            {porZona.map(({ zona, municipios }) => (
              <div key={zona?.id || 'sin'}>
                <h3 className="h6 d-flex align-items-center gap-2">
                  <span className="muestra" style={{ background: zona?.color || '#d9e1df' }} />
                  {zona?.nombre || 'Sin cobertura'} <span className="text-body-secondary fw-normal">({municipios.length})</span>
                </h3>
                <p className="small mb-0">{municipios.map((m) => m.nombre).join(' · ') || <span className="text-body-secondary">Ninguno</span>}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
