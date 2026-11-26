import asyncio
from playwright.async_api import async_playwright
W,H=1600,860; HEAD=46; ROW=29
T={
 'categoria':(40,250,250,[('id','PK'),('nombre',''),('slug','único')]),
 'producto':(360,40,330,[('id','PK'),('categoria_id','FK'),('nombre',''),('slug','único'),('precio',''),('existencias',''),('stock_minimo',''),('imagen · modelo_3d',''),('modelo_codigo','3D'),('especificaciones','JSON'),('activo · eliminado_en','')]),
 'alerta_stock':(800,520,330,[('id','PK'),('producto_id','FK'),('tipo','agotado / bajo'),('existencias',''),('leida_en','')]),
 'pedido_detalle':(800,40,330,[('id','PK'),('pedido_id','FK'),('producto_id','FK'),('producto_nombre',''),('precio_unitario',''),('cantidad · subtotal','')]),
 'pedido':(1230,40,330,[('id','PK'),('folio','único'),('cliente_nombre · correo',''),('direccion',''),('metodo_pago',''),('estado',''),('total','')]),
 'usuario':(1230,470,330,[('id','PK'),('nombre',''),('correo','único'),('password_hash','bcrypt'),('rol','admin / vendedor'),('activo','')]),
}
def fila(t,campo):
    x,y,w,cols=T[t]; i=[c for c,_ in cols].index(campo); return y+HEAD+ROW*i+ROW/2
def caja(t):
    x,y,w,cols=T[t]
    filas=''.join(f'<div style="display:flex;justify-content:space-between;height:{ROW}px;align-items:center;padding:0 12px;border-top:1px solid #dfece7;font:16px Arial;color:#0d1b1e"><span{" style=font-weight:700" if et=="PK" else ""}>{c}</span><span style="font:600 13px Arial;color:{"#0b8f58" if et in ("PK","FK") else "#6b7b7f"}">{et}</span></div>' for c,et in cols)
    return f'<div style="position:absolute;left:{x}px;top:{y}px;width:{w}px;background:#fff;border:2.5px solid #0b8f58;border-radius:12px;overflow:hidden"><div style="height:{HEAD}px;background:#0b8f58;color:#fff;font:700 19px Arial;display:flex;align-items:center;padding:0 12px">{t.upper()}</div>{filas}</div>'
# relaciones: (tabla 1, campo, lado, tabla N, campo, lado)
R=[('categoria','id','r','producto','categoria_id','l',325),('producto','id','r','pedido_detalle','producto_id','l',765),
   ('pedido','id','l','pedido_detalle','pedido_id','r',1180),('producto','id','r','alerta_stock','producto_id','l',725)]
def lado(t,c,l):
    x,y,w,_=T[t]; return (x+w if l=='r' else x, fila(t,c))
lin=[];et=[]
for a,ca,la,b,cb,lb,mx in R:
    (x1,y1),(x2,y2)=lado(a,ca,la),lado(b,cb,lb)
    d=f'M{x1},{y1} L{mx},{y1} L{mx},{y2} L{x2},{y2}'
    lin.append(f'<path d="{d}" fill="none" stroke="#c98a12" stroke-width="3"/>')
    dx1=12 if la=='r' else -26; dx2=-26 if lb=='l' else 12
    et.append(f'<div style="position:absolute;left:{x1+dx1}px;top:{y1-24}px;font:800 17px Arial;color:#c98a12">1</div>')
    et.append(f'<div style="position:absolute;left:{x2+dx2}px;top:{y2-24}px;font:800 17px Arial;color:#c98a12">N</div>')
nota='<div style="position:absolute;left:40px;top:520px;width:600px;font:15px/1.4 Arial;color:#4a5a5e">PostgreSQL 16 · 6 tablas<br><b style="color:#0d1b1e">Pedido_detalle</b> guarda nombre y precio al momento de la compra: si el producto cambia o se borra, el pedido no se altera.<br><b style="color:#0d1b1e">Usuario</b> es solo para el personal del panel.</div>'
pagina=f'<html><body style="margin:0"><div id="l" style="position:relative;width:{W}px;height:{H}px;background:#fff"><svg width="{W}" height="{H}" style="position:absolute">{"".join(lin)}</svg>{"".join(caja(t) for t in T)}{"".join(et)}{nota}</div></body></html>'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':W,'height':H},device_scale_factor=2)
        await pg.set_content(pagina); await pg.locator('#l').screenshot(path='base-de-datos.png'); await b.close()
asyncio.run(main())
