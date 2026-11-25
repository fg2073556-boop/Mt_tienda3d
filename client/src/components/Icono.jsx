/** Ícono de respaldo cuando el producto no tiene foto */
const TRAZOS = {
  tower: <><rect x="14" y="5" width="20" height="38" rx="2" /><circle cx="24" cy="16" r="4" /><circle cx="24" cy="29" r="4" /><path d="M18 39h12" /></>,
  cpu: <><rect x="14" y="14" width="20" height="20" rx="2" /><rect x="19" y="19" width="10" height="10" /><path d="M19 8v6M24 8v6M29 8v6M19 34v6M24 34v6M29 34v6M8 19h6M8 24h6M8 29h6M34 19h6M34 24h6M34 29h6" /></>,
  gpu: <><rect x="5" y="15" width="38" height="18" rx="2" /><circle cx="16" cy="24" r="5" /><circle cx="32" cy="24" r="5" /><path d="M8 33v5h14" /></>,
  ram: <><rect x="5" y="17" width="38" height="12" rx="1" /><path d="M10 21h4M17 21h4M27 21h4M34 21h4M9 29v4M15 29v4M21 29v4M27 29v4M33 29v4M39 29v4" /></>,
  ssd: <><rect x="6" y="18" width="36" height="12" rx="2" /><circle cx="36" cy="24" r="2" /><path d="M11 22h14M11 26h10" /></>,
  psu: <><rect x="7" y="11" width="34" height="26" rx="2" /><circle cx="21" cy="24" r="8" /><path d="M21 16v16M13 24h16M35 17v4" /></>,
  fan: <><circle cx="24" cy="24" r="16" /><circle cx="24" cy="24" r="3" /><path d="M24 21c0-6 3-9 7-9M27 24c6 0 9 3 9 7M24 27c0 6-3 9-7 9M21 24c-6 0-9-3-9-7" /></>,
  monitor: <><rect x="5" y="9" width="38" height="24" rx="2" /><path d="M24 33v6M16 39h16" /></>,
  kb: <><rect x="3" y="18" width="32" height="14" rx="2" /><path d="M8 23h2M13 23h2M18 23h2M23 23h2M28 23h2M10 28h16" /><rect x="38" y="18" width="7" height="12" rx="3.5" /></>,
  desk: <path d="M4 17h40M8 17v22M40 17v22M30 17v12h10M30 23h10" />,
  soft: <><rect x="7" y="9" width="34" height="30" rx="3" /><path d="M7 16h34" /><rect x="13" y="21" width="9" height="7" /><rect x="26" y="21" width="9" height="7" /><rect x="13" y="30" width="9" height="5" /><rect x="26" y="30" width="9" height="5" /></>,
};
const POR_PIEZA = { gab: 'tower', cpu: 'cpu', gpu: 'gpu', ram: 'ram', ssd: 'ssd', psu: 'psu', fans: 'fan', cooler: 'fan', monitor: 'monitor', kb: 'kb', desk: 'desk' };
const POR_CATEGORIA = { equipo: 'tower', componentes: 'cpu', software: 'soft', mobiliario: 'desk' };

export default function Icono({ producto }) {
  const clave = POR_PIEZA[producto.pieza_3d] || POR_CATEGORIA[producto.categoria?.slug] || 'tower';
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRAZOS[clave]}
    </svg>
  );
}
