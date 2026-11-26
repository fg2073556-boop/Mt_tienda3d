import { useCallback, useEffect, useState } from 'react';
import { useAviso } from '../../components/Aviso.jsx';
import MapaZonas, { LeyendaZonas } from '../../components/MapaZonas.jsx';
import { api } from '../../lib/api.js';

/** Panel → Envíos: costo y días de cada zona, y a qué zona pertenece cada municipio */
export default function PanelEnvios() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [elegido, setElegido] = useState(null);
  const avisar = useAviso();

  const cargar = useCallback(() => api('/envios/zonas').then(setDatos).catch((e) => setError(e.message)), []);
  useEffect(() => { cargar(); }, [cargar]);

  const guardarZona = async (e, z) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api(`/admin/envios/zonas/${z.id}`, { method: 'PUT', body: { costo: f.get('costo'), dias_min: f.get('dias_min'), dias_max: f.get('dias_max') } });
      avisar(`${z.nombre} actualizada`);
      cargar();
    } catch (err) { avisar(err.message, 'error'); }
  };

  const cambiarMunicipio = async (zonaId) => {
    try {
      const m = await api(`/admin/envios/municipios/${elegido.cve_mun}`, { method: 'PATCH', body: { zona_id: zonaId === '' ? null : Number(zonaId) } });
      setElegido({ ...elegido, zona_id: m.zona_id });
      avisar(`${m.nombre}: ${datos.zonas.find((z) => z.id === m.zona_id)?.nombre || 'sin cobertura'}`);
      cargar();
    } catch (err) { avisar(err.message, 'error'); }
  };

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <>
      <h1 className="h2 mb-1">Envíos</h1>
      <p className="text-body-secondary">Los paquetes salen de Tepeaca. Cambia el costo y los días de cada zona, o toca un municipio del mapa para cambiar su zona.</p>
      <div className="envios-rejilla">
        <div className="card card-body">
          <MapaZonas datos={datos} destino={elegido?.cve_mun} onElegir={(m) => m && setElegido(m)} />
        </div>
        <aside className="d-flex flex-column gap-3">
          {elegido && (
            <div className="card card-body">
              <h2 className="h6 mb-1">{elegido.nombre}</h2>
              <p className="small text-body-secondary mb-2">≈ {Math.round(elegido.distancia_km * 1.3)} km desde Tepeaca ({elegido.distancia_km} km en línea recta)</p>
              <label className="small fw-semibold">Zona
                <select className="form-select mt-1" value={elegido.zona_id ?? ''} onChange={(e) => cambiarMunicipio(e.target.value)}>
                  {datos.zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                  <option value="">Sin cobertura</option>
                </select>
              </label>
            </div>
          )}
          <div className="card card-body">
            <h2 className="h6">Zonas</h2>
            <LeyendaZonas datos={datos} />
          </div>
        </aside>
      </div>

      <div className="card card-body mt-3">
        <h2 className="h5">Costo y tiempo por zona</h2>
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Zona</th><th colSpan={4}>Costo (MXN) · días mínimos · días máximos</th></tr></thead>
            <tbody>
              {datos?.zonas.map((z) => (
                <tr key={`${z.id}-${z.costo}-${z.dias_min}-${z.dias_max}`}>
                  <td><span className="muestra me-2" style={{ background: z.color }} />{z.nombre}<div className="small text-body-secondary">{z.municipios} municipios</div></td>
                  <td colSpan={4}>
                    <form className="d-flex gap-2 align-items-center flex-wrap" onSubmit={(e) => guardarZona(e, z)}>
                      <input name="costo" type="number" min="0" step="1" className="form-control" style={{ width: 110 }} defaultValue={z.costo} aria-label={`Costo de ${z.nombre}`} />
                      <input name="dias_min" type="number" min="0" className="form-control" style={{ width: 90 }} defaultValue={z.dias_min} aria-label="Días mínimos" />
                      <input name="dias_max" type="number" min="0" className="form-control" style={{ width: 90 }} defaultValue={z.dias_max} aria-label="Días máximos" />
                      <button className="btn btn-mt btn-sm">Guardar</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small text-body-secondary mb-0 mt-2">Pon costo 0 para que el envío sea gratis en esa zona.</p>
      </div>
    </>
  );
}
