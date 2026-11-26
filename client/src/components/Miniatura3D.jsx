import { useEffect, useRef, useState } from 'react';

/**
 * Imagen 3D de un producto para las tarjetas del catálogo. Se pide solo cuando la tarjeta
 * aparece en pantalla; mientras tanto (o si no hay WebGL) se muestra el respaldo.
 */
export default function Miniatura3D({ codigo, alt, respaldo }) {
  const ref = useRef(null);
  const [url, setUrl] = useState(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let vivo = true;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      import('../modelos3d/miniaturas.js')
        .then(({ miniatura }) => miniatura(codigo))
        .then((u) => { if (vivo) setUrl(u); })
        .catch(() => { if (vivo) setFallo(true); });
    }, { rootMargin: '200px' });
    obs.observe(ref.current);
    return () => { vivo = false; obs.disconnect(); };
  }, [codigo]);

  return (
    <div ref={ref} className="miniatura-3d">
      {url ? <img src={url} alt={alt} /> : fallo ? respaldo : <div className="miniatura-cargando" aria-hidden="true">{respaldo}</div>}
    </div>
  );
}
