"""Genera diagramas de flujo en HTML/SVG con posiciones fijas y los exporta a PNG 16:9."""
import asyncio, html
from playwright.async_api import async_playwright
W,H=1600,860
VERDE='#0b8f58'; MENTA='#e6f4ee'; TINTA='#0d1b1e'
def nodo(x,y,w,h,forma,texto):
    return dict(x=x,y=y,w=w,h=h,forma=forma,texto=texto)
def ancla(n,lado):
    x,y,w,h=n['x'],n['y'],n['w'],n['h']
    return {'t':(x,y-h/2),'b':(x,y+h/2),'l':(x-w/2,y),'r':(x+w/2,y),'c':(x,y)}[lado]
def svg_nodo(n):
    x,y,w,h=n['x'],n['y'],n['w'],n['h']; f=n['forma']
    if f=='rombo':
        pts=f"{x},{y-h/2} {x+w/2},{y} {x},{y+h/2} {x-w/2},{y}"
        return f'<polygon points="{pts}" fill="#fff8e6" stroke="#c98a12" stroke-width="2.5"/>'
    rx={'inicio':h/2,'proc':12,'srv':12,'alerta':12}[f]
    fill={'inicio':VERDE,'proc':MENTA,'srv':'#0d2b33','alerta':'#fdecea'}[f]
    st={'inicio':VERDE,'proc':VERDE,'srv':'#0d2b33','alerta':'#c62828'}[f]
    return f'<rect x="{x-w/2}" y="{y-h/2}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{st}" stroke-width="2.5"/>'
def html_texto(n):
    color={'inicio':'#fff','srv':'#fff'}.get(n['forma'],TINTA)
    fs=n.get('fs') or (19 if n['forma']!='rombo' else 18)
    return (f'<div style="position:absolute;left:{n["x"]-n["w"]/2}px;top:{n["y"]-n["h"]/2}px;width:{n["w"]}px;height:{n["h"]}px;'
            f'display:flex;align-items:center;justify-content:center;text-align:center;padding:0 {14 if n["forma"]!="rombo" else 34}px;box-sizing:border-box;'
            f'font:600 {fs}px/1.25 Arial,sans-serif;color:{color}">{n["texto"]}</div>')
def generar(nombre, titulo, nodos, aristas, leyenda='', H=H):
    s=[f'<svg width="{W}" height="{H}" style="position:absolute;left:0;top:0"><defs><marker id="f" markerUnits="userSpaceOnUse" markerWidth="16" markerHeight="16" refX="14" refY="8" orient="auto"><path d="M0,1 L16,8 L0,15 z" fill="{VERDE}"/></marker></defs>']
    etiquetas=[]
    for a in aristas:
        fin=a.get('entra','l'); fin=fin if isinstance(fin,tuple) else ancla(nodos[a['a']],fin)
        pts=[ancla(nodos[a['de']],a.get('sale','r'))]+a.get('por',[])+[fin]
        d='M'+' L'.join(f'{px},{py}' for px,py in pts)
        s.append(f'<path d="{d}" fill="none" stroke="{VERDE}" stroke-width="2.6" marker-end="url(#f)"/>')
        if a.get('txt'):
            ex,ey=a.get('en',((pts[0][0]+pts[1][0])/2,(pts[0][1]+pts[1][1])/2))
            etiquetas.append(f'<div style="position:absolute;left:{ex-100}px;top:{ey-14}px;width:200px;text-align:center;font:700 16px Arial;color:{VERDE}">{a["txt"]}</div>')
    for n in nodos.values(): s.append(svg_nodo(n))
    s.append('</svg>')
    cuerpo=''.join(s)+''.join(html_texto(n) for n in nodos.values())+''.join(etiquetas)
    tit=f'<div style="position:absolute;left:40px;top:22px;font:700 30px Arial;color:{TINTA}">{titulo}</div>' if titulo else ''
    ley=f'<div style="position:absolute;left:40px;bottom:18px;font:16px Arial;color:#4a5a5e">{leyenda}</div>' if leyenda else ''
    return f'<html><body style="margin:0"><div id="lienzo" style="position:relative;width:{W}px;height:{H}px;background:#fff">{tit}{cuerpo}{ley}</div></body></html>'

N=nodo
compra={
 'A':N(95,105,150,70,'inicio','Cliente entra<br>sin cuenta'),
 'B':N(275,105,180,84,'proc','Ve el catálogo:<br>foto y al tocar, 3D'),
 'C':N(470,105,170,110,'rombo','¿Necesita<br>ayuda?'),
 'D':N(470,262,200,76,'proc','Asesor con Gemini<br>recomienda'),
 'E':N(650,105,150,76,'proc','Toca<br>"Agregar"'),
 'F':N(835,105,170,110,'rombo','¿Tiene<br>sesión?'),
 'G':N(835,268,230,96,'proc','Crea su cuenta o inicia<br>sesión y regresa con<br>el producto'),
 'H':N(1065,105,230,84,'proc','Carrito y pago: datos<br>de la cuenta + CP'),
 'J':N(1340,105,200,120,'rombo','¿Hay envío<br>a ese CP?'),
 'K':N(1340,262,250,84,'alerta','Aviso: no llegamos a<br>esa zona (mapa de zonas)'),
 'L':N(1440,430,250,92,'proc','Elige pago con Openpay:<br>tarjeta · SPEI · tienda'),
 'M':N(1160,430,240,92,'srv','Servidor: transacción<br>que bloquea productos'),
 'O2':N(880,430,200,120,'rombo','¿Alcanzan las<br>existencias?'),
 'V':N(880,572,270,76,'alerta','"Solo quedan X":<br>no se guarda nada'),
 'O':N(600,430,250,100,'srv','Crea pedido con folio,<br>descuenta y cobra<br>con Openpay'),
 'P':N(330,430,190,120,'rombo','¿Cobro<br>aceptado?'),
 'W':N(105,430,170,100,'alerta','Tarjeta rechazada:<br>se deshace<br>todo'),
 'Q':N(330,700,270,92,'proc','Pagado con tarjeta o<br>pendiente con referencia<br>SPEI / tienda'),
 'R':N(660,700,200,120,'rombo','¿Quedó en 0<br>o en el mínimo?'),
 'S':N(660,838,320,64,'alerta','Alerta y aviso al proveedor<br>por correo y WhatsApp'),
 'T':N(990,700,240,84,'inicio','Confirmación<br>con folio MT-00000'),
 'U':N(1340,700,280,84,'proc','Mis pedidos o<br>Rastrea tu pedido'),
}
for n in compra.values(): n['fs']=17 if n['forma']!='rombo' else 16
ac=[
 dict(de='A',a='B'),dict(de='B',a='C'),
 dict(de='C',a='E',txt='No',en=(562,80)),
 dict(de='C',a='D',sale='b',entra='t',txt='Sí',en=(495,190)),
 dict(de='D',a='E',sale='r',entra='b',por=[(650,262)]),
 dict(de='E',a='F'),
 dict(de='F',a='H',txt='Sí',en=(950,82)),
 dict(de='F',a='G',sale='b',entra='t',txt='No',en=(860,192)),
 dict(de='G',a='H',sale='r',entra=(1000,147),por=[(1000,268)]),
 dict(de='H',a='J'),
 dict(de='J',a='K',sale='b',entra='t',txt='No',en=(1365,190)),
 dict(de='K',a='H',sale='l',entra=(1130,147),por=[(1130,262)]),
 dict(de='J',a='L',sale='r',entra=(1530,384),por=[(1530,105)],txt='Sí',en=(1530,82)),
 dict(de='L',a='M',sale='l',entra='r'),
 dict(de='M',a='O2',sale='l',entra='r'),
 dict(de='O2',a='V',sale='b',entra='t',txt='No',en=(905,500)),
 dict(de='O2',a='O',sale='l',entra='r',txt='Sí',en=(752,408)),
 dict(de='O',a='P',sale='l',entra='r'),
 dict(de='P',a='W',sale='l',entra='r',txt='No',en=(213,408)),
 dict(de='P',a='Q',sale='b',entra='t',txt='Sí',en=(355,560)),
 dict(de='Q',a='R',sale='r',entra='l'),
 dict(de='R',a='S',sale='b',entra='t',txt='Sí',en=(685,778)),
 dict(de='R',a='T',sale='r',entra='l',txt='No',en=(815,678)),
 dict(de='S',a='T',sale='r',entra='b',por=[(990,838)]),
 dict(de='T',a='U',sale='r',entra='l'),
]
panel={
 'A':N(140,170,200,80,'inicio','Personal entra<br>al panel'),
 'B':N(400,170,210,80,'proc','Escribe correo<br>y contraseña'),
 'C':N(660,170,200,120,'rombo','¿Datos<br>correctos?'),
 'D':N(940,170,240,90,'srv','Sesión con token JWT<br>válida 8 horas'),
 'E':N(1230,170,180,120,'rombo','¿Rol?'),
 'F':N(1390,390,320,90,'proc','Productos: alta, edición y baja<br>con foto, modelo 3D e IA'),
 'G':N(800,390,250,80,'proc','Pedidos y existencias'),
 'H':N(1390,580,250,80,'proc','Ajusta existencias'),
 'I':N(1390,760,280,80,'alerta','Alerta si se agota<br>o llega al mínimo'),
 'J':N(800,580,250,80,'proc','Cambia el estado<br>del pedido'),
 'K':N(380,580,470,80,'proc','Pendiente → Pagado → Preparación<br>→ Enviado → Entregado'),
 'L':N(380,760,330,80,'alerta','Cancelado: regresa las piezas<br>al inventario'),
}
ap=[
 dict(de='A',a='B'),dict(de='B',a='C'),
 dict(de='C',a='B',sale='t',entra='t',por=[(660,70),(400,70)],txt='No',en=(530,70)),
 dict(de='C',a='D',txt='Sí',en=(790,150)),
 dict(de='D',a='E'),
 dict(de='E',a='F',sale='r',entra='t',por=[(1390,170)],txt='Solo admin',en=(1450,250)),
 dict(de='E',a='G',sale='b',entra='t',por=[(1230,280),(800,280)],txt='Ambos roles',en=(1010,280)),
 dict(de='F',a='H',sale='b',entra='t'),
 dict(de='G',a='H',sale='r',entra='l',por=[(1080,390),(1080,580)]),
 dict(de='H',a='I',sale='b',entra='t'),
 dict(de='G',a='J',sale='b',entra='t'),
 dict(de='J',a='K',sale='l',entra='r'),
 dict(de='J',a='L',sale='b',entra='r',por=[(800,760)]),
]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':W,'height':H}, device_scale_factor=2)
        for nombre,titulo,n,a,ley,alto in [('flujo-compra','',compra,ac,'Rombo = decisión · Azul oscuro = proceso en el servidor · Rojo = aviso o alerta · Si algo falla dentro de la transacción, no se guarda nada',950),
                                       ('flujo-panel','',panel,ap,'Administrador: todo el panel · Vendedor: pedidos y existencias',860)]:
            await pg.set_viewport_size({'width':W,'height':alto}); await pg.set_content(generar(nombre,titulo,n,a,ley,alto)); await pg.wait_for_timeout(200)
            await pg.locator('#lienzo').screenshot(path=f'{nombre}.png'); print('ok',nombre)
        await b.close()
asyncio.run(main())
