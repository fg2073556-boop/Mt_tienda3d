/**
 * Envíos dentro de Puebla. Los paquetes salen de la tienda en Tepeaca.
 * Con el código postal se sabe el municipio (catálogo SEPOMEX) y con el municipio la zona:
 * costo y días de entrega. Los municipios sin zona no tienen cobertura.
 * Las licencias de software se entregan por correo y no pagan envío.
 */

export const TIENDA = { cve_mun: '164', municipio: 'Tepeaca', estado: 'Puebla' };
export const FACTOR_CARRETERA = 1.3; // la carretera es ~30 % más larga que la línea recta

export const esDigital = (categoriaSlug) => categoriaSlug === 'software';

const ESTADOS_POR_CP = [
  [[0, 16], 'Ciudad de México'], [[20, 20], 'Aguascalientes'], [[21, 22], 'Baja California'], [[23, 23], 'Baja California Sur'],
  [[24, 24], 'Campeche'], [[25, 27], 'Coahuila'], [[28, 28], 'Colima'], [[29, 30], 'Chiapas'], [[31, 33], 'Chihuahua'],
  [[34, 35], 'Durango'], [[36, 38], 'Guanajuato'], [[39, 41], 'Guerrero'], [[42, 43], 'Hidalgo'], [[44, 49], 'Jalisco'],
  [[50, 57], 'Estado de México'], [[58, 61], 'Michoacán'], [[62, 62], 'Morelos'], [[63, 63], 'Nayarit'], [[64, 67], 'Nuevo León'],
  [[68, 71], 'Oaxaca'], [[72, 75], 'Puebla'], [[76, 76], 'Querétaro'], [[77, 77], 'Quintana Roo'], [[78, 79], 'San Luis Potosí'],
  [[80, 82], 'Sinaloa'], [[83, 85], 'Sonora'], [[86, 86], 'Tabasco'], [[87, 89], 'Tamaulipas'], [[90, 90], 'Tlaxcala'],
  [[91, 96], 'Veracruz'], [[97, 97], 'Yucatán'], [[98, 99], 'Zacatecas'],
];
/** Estado al que pertenece un CP por sus dos primeros dígitos */
export function estadoDeCp(cp) {
  const p = Number(String(cp).slice(0, 2));
  return ESTADOS_POR_CP.find(([[a, b]]) => p >= a && p <= b)?.[1] || null;
}

const zonaPublica = (r) => (r.zona_id ? {
  id: r.zona_id, nombre: r.zona_nombre, costo: Number(r.costo), dias_min: r.dias_min, dias_max: r.dias_max, color: r.color,
} : null);

/**
 * ¿Llegamos a ese código postal? ¿Cuánto cuesta y cuánto tarda?
 * @returns {Promise<{cp:string, cubre:boolean, motivo?:string, mensaje:string, estado:string|null,
 *   municipio?:string, cve_mun?:string, colonias:Array<{nombre:string,tipo:string}>, zona?:object, ruta?:object}>}
 */
export async function cotizar(db, cp) {
  cp = String(cp ?? '').trim();
  if (!/^\d{5}$/.test(cp)) {
    return { cp, cubre: false, motivo: 'cp_invalido', mensaje: 'El código postal debe tener 5 números.', estado: null, colonias: [] };
  }
  const estado = estadoDeCp(cp);
  const { rows } = await db.query(
    `SELECT c.colonia, c.tipo, m.cve_mun, m.nombre AS municipio, m.distancia_km, m.zona_id,
            z.nombre AS zona_nombre, z.costo, z.dias_min, z.dias_max, z.color
     FROM codigo_postal c
     JOIN municipio_envio m ON m.cve_mun = c.cve_mun
     LEFT JOIN zona_envio z ON z.id = m.zona_id
     WHERE c.cp = $1
     ORDER BY c.colonia`,
    [cp],
  );

  if (!rows.length) {
    if (estado !== 'Puebla') {
      return {
        cp, cubre: false, motivo: 'fuera_de_puebla', estado, colonias: [],
        mensaje: `Por ahora solo enviamos dentro del estado de Puebla${estado ? ` (ese código es de ${estado})` : ''}.`,
      };
    }
    return { cp, cubre: false, motivo: 'cp_desconocido', estado, colonias: [], mensaje: 'No encontramos ese código postal en Puebla. Revisa que esté bien escrito.' };
  }

  // Casi siempre un CP es de un solo municipio; si son varios, se toma el del primero
  const r = rows[0];
  const colonias = rows.filter((x) => x.cve_mun === r.cve_mun).map((x) => ({ nombre: x.colonia, tipo: x.tipo }));
  const base = {
    cp, estado: 'Puebla', municipio: r.municipio, cve_mun: r.cve_mun, colonias,
    ruta: { origen: TIENDA.municipio, destino: r.municipio, km_linea_recta: Number(r.distancia_km), km_aprox: Math.round(Number(r.distancia_km) * FACTOR_CARRETERA) },
  };
  const zona = zonaPublica(r);
  if (!zona) {
    return { ...base, cubre: false, motivo: 'sin_cobertura', mensaje: `Todavía no llegamos a ${r.municipio}: está a unos ${base.ruta.km_aprox} km de la tienda.` };
  }
  return {
    ...base, cubre: true, zona,
    mensaje: `Sí llegamos a ${r.municipio}: ${zona.nombre}, ${zona.dias_min}–${zona.dias_max} días hábiles.`,
  };
}

/** Zonas y municipios para el mapa */
export async function mapaDeZonas(db) {
  const [zonas, municipios] = await Promise.all([
    db.query(`SELECT z.*, (SELECT COUNT(*)::int FROM municipio_envio m WHERE m.zona_id = z.id) AS municipios
              FROM zona_envio z ORDER BY z.id`),
    db.query('SELECT cve_mun, nombre, distancia_km, zona_id FROM municipio_envio ORDER BY nombre'),
  ]);
  return {
    tienda: TIENDA,
    zonas: zonas.rows.map((z) => ({ ...z, costo: Number(z.costo) })),
    municipios: municipios.rows.map((m) => ({ ...m, distancia_km: Number(m.distancia_km) })),
  };
}
