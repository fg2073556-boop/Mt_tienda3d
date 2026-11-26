"""Diagrama entidad-relación de la base de datos de M&T (PostgreSQL 16).

Refleja database/schema.sql más las migraciones de database/migraciones (001–010).
Genera docs/diagramas/base-de-datos.png:  cd docs/diagramas && python fuente/base_de_datos.py
"""
import asyncio
from playwright.async_api import async_playwright

W, H = 2090, 1050
HEAD, ROW = 44, 25

# Módulo → color del encabezado
MOD = {
    'catalogo': ('#0b8f58', 'Catálogo e inventario'),
    'ventas': ('#1d5fa8', 'Ventas y pagos'),
    'cuentas': ('#6b4fbb', 'Cuentas'),
    'envios': ('#c47a06', 'Envíos'),
    'sistema': ('#6b7b7f', 'Sistema'),
}

# tabla: (módulo, x, y, ancho, [(columna, etiqueta)])
T = {
    'categoria': ('catalogo', 40, 70, 300, [('id', 'PK'), ('nombre', ''), ('slug', 'único')]),
    'usuario': ('cuentas', 40, 300, 300, [
        ('id', 'PK'), ('nombre', ''), ('correo', 'único'), ('password_hash', 'bcrypt'),
        ('rol', 'admin · vendedor · cliente'), ('telefono', ''), ('activo', ''), ('creado_en', '')]),
    'producto': ('catalogo', 430, 70, 330, [
        ('id', 'PK'), ('categoria_id', 'FK'), ('nombre', ''), ('slug', 'único'), ('descripcion', ''),
        ('precio', '> 0'), ('existencias', '≥ 0'), ('stock_minimo', '≥ 0'), ('imagen', 'foto'),
        ('modelo_3d', 'archivo .glb'), ('pieza_3d', ''), ('modelo_codigo', '3D por código'),
        ('especificaciones', 'JSON'), ('activo', ''), ('eliminado_en', 'borrado lógico'),
        ('creado_en', ''), ('actualizado_en', '')]),
    'ajuste_reposicion': ('catalogo', 430, 640, 330, [
        ('id', 'PK · siempre 1'), ('correo_destino', ''), ('aviso_automatico', ''), ('proveedor_nombre', ''),
        ('proveedor_whatsapp', ''), ('whatsapp_automatico', ''), ('actualizado_en', '')]),
    'pedido_detalle': ('ventas', 850, 70, 320, [
        ('id', 'PK'), ('pedido_id', 'FK · CASCADE'), ('producto_id', 'FK · SET NULL'), ('producto_nombre', 'copia'),
        ('precio_unitario', 'copia'), ('cantidad', '> 0'), ('subtotal', '')]),
    'alerta_stock': ('catalogo', 850, 340, 320, [
        ('id', 'PK'), ('producto_id', 'FK · CASCADE'), ('tipo', 'agotado · bajo'), ('existencias', ''),
        ('leida_en', ''), ('notificada_en', 'correo enviado'), ('creada_en', '')]),
    'migracion_hecha': ('sistema', 850, 640, 320, [('nombre', 'PK'), ('hecha_en', '')]),
    'pedido': ('ventas', 1260, 70, 360, [
        ('id', 'PK'), ('folio', 'único · MT-00001'), ('usuario_id', 'FK · opcional'), ('cliente_nombre', ''),
        ('cliente_correo', ''), ('cliente_telefono', ''), ('direccion', ''),
        ('metodo_pago', 'tarjeta · transferencia · tienda'), ('estado', 'pendiente → entregado'), ('total', ''),
        ('pago_proveedor', 'openpay'), ('pago_id', ''), ('pago_estado', ''), ('pago_datos', 'JSON'),
        ('pagado_en', ''), ('envio_cp', ''), ('envio_colonia', ''), ('envio_municipio', ''),
        ('envio_zona', ''), ('envio_km', ''), ('envio_dias', ''), ('envio_costo', ''),
        ('creado_en', ''), ('actualizado_en', '')]),
    'zona_envio': ('envios', 1710, 70, 310, [
        ('id', 'PK'), ('nombre', ''), ('costo', '≥ 0'), ('dias_min', ''), ('dias_max', ''), ('color', 'mapa')]),
    'municipio_envio': ('envios', 1710, 330, 310, [
        ('cve_mun', 'PK · INEGI'), ('nombre', ''), ('lat', ''), ('lon', ''), ('distancia_km', 'desde Tepeaca'),
        ('zona_id', 'FK · vacío = sin cobertura')]),
    'codigo_postal': ('envios', 1710, 590, 310, [
        ('cve_mun', 'PK · FK'), ('id_asenta', 'PK'), ('cp', 'SEPOMEX'), ('colonia', ''), ('tipo', ''),
        ('zona_urbana', '')]),
}

CUENTA = {'producto': '34 filas', 'codigo_postal': '6,401 filas', 'municipio_envio': '217 filas',
          'zona_envio': '3 zonas', 'ajuste_reposicion': '1 fila'}


def fila(t, campo):
    _, x, y, w, cols = T[t]
    return y + HEAD + ROW * [c for c, _ in cols].index(campo) + ROW / 2


def borde(t, campo, lado):
    _, x, y, w, _ = T[t]
    return (x + w if lado == 'r' else x, fila(t, campo))


def caja(t):
    m, x, y, w, cols = T[t]
    color = MOD[m][0]
    filas = ''.join(
        f'<div class="f"><span class="{"pk" if "PK" in et else "fk" if "FK" in et else ""}">{c}</span>'
        f'<i class="{"llave" if ("PK" in et or "FK" in et) else ""}" style="--c:{color}">{et}</i></div>'
        for c, et in cols)
    extra = f'<small>{CUENTA[t]}</small>' if t in CUENTA else ''
    return (f'<div class="t" style="left:{x}px;top:{y}px;width:{w}px;--c:{color}">'
            f'<div class="h">{t}{extra}</div>{filas}</div>')


# Relaciones reales (FOREIGN KEY): (tabla 1, campo, lado, tabla M, campo, lado, ruta, texto)
R = [
    ('categoria', 'id', 'r', 'producto', 'categoria_id', 'l', [380], ''),
    ('producto', 'id', 'r', 'pedido_detalle', 'producto_id', 'l', [800], ''),
    ('producto', 'id', 'r', 'alerta_stock', 'producto_id', 'l', [815], ''),
    ('pedido', 'id', 'l', 'pedido_detalle', 'pedido_id', 'r', [1205], ''),
    ('zona_envio', 'id', 'r', 'municipio_envio', 'zona_id', 'r', [2045], ''),
    ('municipio_envio', 'cve_mun', 'r', 'codigo_postal', 'cve_mun', 'r', [2068], ''),
]


def ruta(p1, p2, xs):
    (x1, y1), (x2, y2) = p1, p2
    pts = [(x1, y1), (xs[0], y1), (xs[0], y2), (x2, y2)]
    return 'M' + ' L'.join(f'{a},{b}' for a, b in pts)


lineas, marcas = [], []


def marca(x, y, texto, izquierda):
    dx = -22 if izquierda else 8
    marcas.append(f'<b class="m" style="left:{x + dx}px;top:{y - 23}px">{texto}</b>')


for a, ca, la, b, cb, lb, xs, txt in R:
    p1, p2 = borde(a, ca, la), borde(b, cb, lb)
    lineas.append(f'<path d="{ruta(p1, p2, xs)}"/>')
    marca(p1[0], p1[1], '1', la == 'l')
    marca(p2[0], p2[1], 'M', lb == 'l')
    if txt:
        marcas.append(f'<em style="left:{xs[0] + 6}px;top:{(p1[1] + p2[1]) / 2 - 9}px">{txt}</em>')

# usuario 1 — M pedido (rodea por abajo)
u, pu = borde('usuario', 'id', 'r'), borde('pedido', 'usuario_id', 'l')
lineas.append(f'<path d="M{u[0]},{u[1]} L395,{u[1]} L395,985 L1230,985 L1230,{pu[1]} L{pu[0]},{pu[1]}"/>')
marca(*u, '1', False)
marca(*pu, 'M', True)
marcas.append('<em style="left:560px;top:991px">SET NULL · los pedidos de invitado o anteriores a las cuentas no tienen usuario</em>')

# Relación lógica (sin FK): el pedido copia CP, colonia, municipio y zona al comprar
pc, cp = borde('pedido', 'envio_cp', 'r'), borde('codigo_postal', 'cp', 'l')
lineas.append(f'<path class="logica" d="M{pc[0]},{pc[1]} L1665,{pc[1]} L1665,{cp[1]} L{cp[0]},{cp[1]}"/>')
marcas.append(f'<em class="gris" style="left:1633px;top:{(pc[1] + cp[1]) / 2 - 24}px;width:64px;text-align:center;background:#f6f9f8;padding:3px 0">copia al<br>comprar<br>(sin FK)</em>')

leyenda = ''.join(f'<span><i style="background:{c}"></i>{n}</span>' for c, n in MOD.values())
notas = f'''
<div class="notas" style="left:1260px;top:815px;width:770px">
  <div class="ley">{leyenda}</div>
  <p><b>1 — M</b> relación con llave foránea · <b>CASCADE</b> se borra con el padre · <b>SET NULL</b> se conserva sin el padre ·
  <span class="punteada"></span> relación lógica sin llave foránea.</p>
  <p><b>pedido_detalle</b> y los campos <b>envio_*</b> de pedido guardan una copia al momento de la compra: si cambia un precio,
  una zona o se borra un producto, el pedido no se altera. Los números de tarjeta nunca se guardan (Openpay los tokeniza).</p>
</div>'''

titulo = ('<div class="titulo"><b>M&amp;T · Base de datos</b><span>PostgreSQL 16 · 11 tablas · '
          'schema.sql + migraciones 001–010</span></div>')

CSS = '''
body{margin:0;font-family:Inter,Arial,sans-serif}
#l{position:relative;width:%dpx;height:%dpx;background:#f6f9f8}
.titulo{position:absolute;left:40px;top:18px;display:flex;gap:16px;align-items:baseline}
.titulo b{font:800 24px Arial;color:#0c1b21}.titulo span{color:#53666c;font-size:15px}
.t{position:absolute;background:#fff;border:2px solid var(--c);border-radius:12px;overflow:hidden;box-shadow:0 10px 24px -18px rgba(6,16,24,.45)}
.h{height:%dpx;background:var(--c);color:#fff;font:700 18px Arial;display:flex;align-items:center;justify-content:space-between;padding:0 12px;text-transform:uppercase;letter-spacing:.02em}
.h small{font:600 12px Arial;text-transform:none;letter-spacing:0;opacity:.85}
.f{display:flex;justify-content:space-between;gap:8px;height:%dpx;align-items:center;padding:0 12px;border-top:1px solid #e6eeeb;font-size:15px;color:#0d1b1e}
.f .pk{font-weight:700}.f .fk{font-weight:600}
.f i{font:600 12px Arial;font-style:normal;color:#6b7b7f;white-space:nowrap}
.f i.llave{color:var(--c)}
svg path{fill:none;stroke:#3d5157;stroke-width:2.4}
svg path.logica{stroke:#8a9a9e;stroke-dasharray:7 6}
.m{position:absolute;font:800 16px Arial;color:#0c1b21}
em{position:absolute;font:700 11px Arial;font-style:normal;color:#3d5157;letter-spacing:.02em}
em.gris{color:#6b7b7f;font-weight:600;line-height:1.25}
.notas{position:absolute;background:#fff;border:1px solid #d8e2e0;border-radius:12px;padding:14px 18px;font-size:14px;line-height:1.45;color:#33464c}
.notas p{margin:8px 0 0}.notas b{color:#0c1b21}
.ley{display:flex;gap:16px;flex-wrap:wrap;font-weight:600;color:#0c1b21}
.ley span{display:flex;align-items:center;gap:6px}.ley i{width:14px;height:14px;border-radius:4px;display:inline-block}
.punteada{display:inline-block;width:34px;border-top:2.4px dashed #8a9a9e;vertical-align:middle}
''' % (W, H, HEAD, ROW)

pagina = (f'<html><head><style>{CSS}</style></head><body><div id="l">{titulo}'
          f'<svg width="{W}" height="{H}" style="position:absolute">{"".join(lineas)}</svg>'
          f'{"".join(caja(t) for t in T)}{"".join(marcas)}{notas}</div></body></html>')


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': W, 'height': H}, device_scale_factor=2)
        await pg.set_content(pagina)
        await pg.locator('#l').screenshot(path='base-de-datos.png')
        await b.close()

asyncio.run(main())
