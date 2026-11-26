"""
Genera los datos de envíos de la tienda a partir de dos repositorios públicos:

  - Códigos postales (SEPOMEX): https://github.com/IcaliaLabs/sepomex  → lib/sepomex_db.csv (licencia MIT)
  - Municipios de Puebla (INEGI): https://github.com/PhantomInsights/mexico-geojson → 2021/states/Puebla.json (MIT)

Salidas:
  database/migraciones/008-envios.sql                 zonas de envío y los 217 municipios con su distancia a la tienda
  database/migraciones/009-codigos-postales-puebla.sql  códigos postales y colonias de Puebla
  client/public/mapas/puebla-municipios.json          mapa simplificado para dibujar las zonas

Uso:
  python3 datos/fuentes/generar_envios.py RUTA/sepomex_db.csv RUTA/Puebla.json
"""
import csv, json, math, sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
TIENDA = '164'           # Tepeaca: de ahí sale el paquete
ZONAS = [                # (id, nombre, km máximo, costo, días mín, días máx, color)
    (1, 'Zona 1 · Local', 35, 49, 1, 2, '#0b8f58'),
    (2, 'Zona 2 · Regional', 80, 89, 2, 3, '#36b37e'),
    (3, 'Zona 3 · Estatal', 120, 129, 3, 5, '#e0a21e'),
]
TOLERANCIA = 0.0025      # grados (~250 m) para simplificar el mapa


def anillos(geom):
    polys = [geom['coordinates']] if geom['type'] == 'Polygon' else geom['coordinates']
    return polys


def area_centroide(ring):
    a = cx = cy = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        f = x1 * y2 - x2 * y1
        a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f
    a /= 2
    return a, (cx / (6 * a), cy / (6 * a)) if a else ring[0]


def centroide(geom):
    total = sx = sy = 0.0
    for poly in anillos(geom):
        a, (x, y) = area_centroide(poly[0])
        a = abs(a); total += a; sx += x * a; sy += y * a
    return sx / total, sy / total


def km(a, b):
    (lon1, lat1), (lon2, lat2) = a, b
    p1, p2 = math.radians(lat1), math.radians(lat2)
    h = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


def simplificar(puntos, tol):
    """Douglas-Peucker"""
    if len(puntos) < 4:
        return puntos
    (x1, y1), (x2, y2) = puntos[0], puntos[-1]
    dx, dy = x2 - x1, y2 - y1
    largo = math.hypot(dx, dy) or 1e-12
    peor, idx = 0, 0
    for i in range(1, len(puntos) - 1):
        x, y = puntos[i]
        d = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / largo
        if d > peor:
            peor, idx = d, i
    if peor <= tol:
        return [puntos[0], puntos[-1]]
    return simplificar(puntos[:idx + 1], tol)[:-1] + simplificar(puntos[idx:], tol)


def sql(v):
    return 'NULL' if v is None else "'" + str(v).replace("'", "''") + "'"


def main(ruta_cp, ruta_geo):
    geo = json.loads(Path(ruta_geo).read_text(encoding='utf-8'))
    municipios = {}
    for f in geo['features']:
        p = f['properties']
        municipios[p['CVE_MUN']] = {'nombre': p['NOM_MUN'], 'centro': centroide(f['geometry']), 'geom': f['geometry']}
    tienda = municipios[TIENDA]['centro']
    for cve, m in municipios.items():
        m['km'] = round(km(tienda, m['centro']), 1)
        m['zona'] = next((z[0] for z in ZONAS if m['km'] <= z[2]), None)

    # ---- 008: zonas y municipios
    filas = ',\n  '.join(
        f"({sql(c)}, {sql(m['nombre'])}, {m['centro'][1]:.5f}, {m['centro'][0]:.5f}, {m['km']}, {m['zona'] if m['zona'] else 'NULL'})"
        for c, m in sorted(municipios.items()))
    zonas = ',\n  '.join(f"({z[0]}, {sql(z[1])}, {z[3]}, {z[4]}, {z[5]}, {sql(z[6])})" for z in ZONAS)
    (RAIZ / 'database/migraciones/008-envios.sql').write_text(f"""-- Envíos: zonas de cobertura dentro de Puebla. Generado con datos/fuentes/generar_envios.py
-- Los paquetes salen de la tienda en Tepeaca; la zona depende de la distancia en línea recta al
-- centro de cada municipio (Zona 1 ≤ {ZONAS[0][2]} km, Zona 2 ≤ {ZONAS[1][2]} km, Zona 3 ≤ {ZONAS[2][2]} km, más lejos: sin cobertura).
-- El administrador puede cambiar costos, días y la zona de cada municipio desde el panel.
CREATE TABLE IF NOT EXISTS zona_envio (
    id         INT          PRIMARY KEY,
    nombre     VARCHAR(60)  NOT NULL,
    costo      NUMERIC(8,2) NOT NULL CHECK (costo >= 0),
    dias_min   INT          NOT NULL CHECK (dias_min >= 0),
    dias_max   INT          NOT NULL CHECK (dias_max >= dias_min),
    color      VARCHAR(9)   NOT NULL DEFAULT '#0b8f58'
);
INSERT INTO zona_envio (id, nombre, costo, dias_min, dias_max, color) VALUES
  {zonas}
ON CONFLICT (id) DO NOTHING;

-- Los 217 municipios de Puebla (claves INEGI). zona_id NULL = no llegamos.
CREATE TABLE IF NOT EXISTS municipio_envio (
    cve_mun       CHAR(3)       PRIMARY KEY,
    nombre        VARCHAR(80)   NOT NULL,
    lat           NUMERIC(8,5)  NOT NULL,
    lon           NUMERIC(8,5)  NOT NULL,
    distancia_km  NUMERIC(6,1)  NOT NULL,
    zona_id       INT           REFERENCES zona_envio(id)
);
INSERT INTO municipio_envio (cve_mun, nombre, lat, lon, distancia_km, zona_id) VALUES
  {filas}
ON CONFLICT (cve_mun) DO NOTHING;

-- El envío queda guardado en el pedido (con el costo del momento)
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS envio_cp        CHAR(5);
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS envio_colonia   VARCHAR(120);
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS envio_municipio VARCHAR(80);
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS envio_zona      VARCHAR(60);
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS envio_km        NUMERIC(6,1);
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS envio_dias      VARCHAR(20);
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS envio_costo     NUMERIC(8,2) NOT NULL DEFAULT 0;
""", encoding='utf-8')

    # ---- 009: códigos postales de Puebla (c_estado = 21)
    vistos, cps = set(), []
    with open(ruta_cp, encoding='utf-8') as f:
        for r in csv.reader(f, delimiter='|'):
            if len(r) < 15 or r[7] != '21' or r[11] not in municipios:
                continue
            clave = (r[11], r[12])
            if clave in vistos:
                continue
            vistos.add(clave)
            cps.append((r[0], r[1], r[2], r[11], r[13], r[12]))
    cps.sort()
    valores = ',\n  '.join(f"({sql(a)}, {sql(b)}, {sql(c)}, {sql(d)}, {sql(e)}, {sql(g)})" for a, b, c, d, e, g in cps)
    (RAIZ / 'database/migraciones/009-codigos-postales-puebla.sql').write_text(f"""-- Códigos postales y colonias del estado de Puebla (catálogo SEPOMEX).
-- Fuente: https://github.com/IcaliaLabs/sepomex (lib/sepomex_db.csv, licencia MIT). Generado con datos/fuentes/generar_envios.py
CREATE TABLE IF NOT EXISTS codigo_postal (
    cp          CHAR(5)      NOT NULL,
    colonia     VARCHAR(120) NOT NULL,
    tipo        VARCHAR(40)  NOT NULL,
    cve_mun     CHAR(3)      NOT NULL REFERENCES municipio_envio(cve_mun),
    zona_urbana VARCHAR(10),
    id_asenta   CHAR(4)      NOT NULL,
    PRIMARY KEY (cve_mun, id_asenta)
);
CREATE INDEX IF NOT EXISTS idx_codigo_postal_cp ON codigo_postal(cp);
INSERT INTO codigo_postal (cp, colonia, tipo, cve_mun, zona_urbana, id_asenta) VALUES
  {valores}
ON CONFLICT DO NOTHING;
""", encoding='utf-8')

    # ---- Mapa simplificado
    feats = []
    for c, m in sorted(municipios.items()):
        polys = []
        for poly in anillos(m['geom']):
            rings = []
            for ring in poly:
                s = simplificar([(round(x, 4), round(y, 4)) for x, y in ring], TOLERANCIA)
                if len(s) >= 4:
                    rings.append([list(p) for p in s])
            if rings:
                polys.append(rings)
        feats.append({'type': 'Feature', 'properties': {'cve': c, 'nombre': m['nombre']},
                      'geometry': {'type': 'MultiPolygon', 'coordinates': polys}})
    salida = RAIZ / 'client/public/mapas/puebla-municipios.json'
    salida.parent.mkdir(parents=True, exist_ok=True)
    salida.write_text(json.dumps({'type': 'FeatureCollection', 'tienda': TIENDA, 'features': feats}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

    conteo = {z[1]: sum(1 for m in municipios.values() if m['zona'] == z[0]) for z in ZONAS}
    conteo['Sin cobertura'] = sum(1 for m in municipios.values() if m['zona'] is None)
    print('Municipios por zona:', conteo)
    print('Códigos postales/colonias:', len(cps), '· CP distintos:', len({c[0] for c in cps}))
    print('Mapa:', salida.stat().st_size // 1024, 'KB')


if __name__ == '__main__':
    main(*sys.argv[1:3])
