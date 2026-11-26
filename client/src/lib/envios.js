import { useEffect, useState } from 'react';
import { api } from './api.js';

/** Cotiza el envío en cuanto el código postal tiene 5 números */
export function useCotizacion(cp) {
  const [estado, setEstado] = useState({ cargando: false, datos: null, error: '' });
  useEffect(() => {
    const limpio = String(cp || '').replace(/\D/g, '');
    if (limpio.length !== 5) { setEstado({ cargando: false, datos: null, error: '' }); return undefined; }
    let vivo = true;
    setEstado((e) => ({ ...e, cargando: true, error: '' }));
    const t = setTimeout(() => {
      api(`/envios/cotizar?cp=${limpio}`)
        .then((datos) => { if (vivo) setEstado({ cargando: false, datos, error: '' }); })
        .catch((e) => { if (vivo) setEstado({ cargando: false, datos: null, error: e.message }); });
    }, 250);
    return () => { vivo = false; clearTimeout(t); };
  }, [cp]);
  return estado;
}

export const dias = (z) => (z.dias_min === z.dias_max ? `${z.dias_min} día${z.dias_min === 1 ? '' : 's'} hábil${z.dias_min === 1 ? '' : 'es'}` : `${z.dias_min}–${z.dias_max} días hábiles`);
