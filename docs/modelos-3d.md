# Piezas 3D hechas con código

Las piezas que se ven en el catálogo, en la ficha de cada producto y en la galería (`/galeria-3d`) no son archivos `.glb`: se construyen con **three.js** al momento, con formas básicas, texturas dibujadas en un `<canvas>` y materiales metálicos que reflejan un "cuarto" virtual. No se necesita ningún programa de pago.

Son **representaciones ilustrativas**: respetan medidas, forma general y detalles reconocibles (número de ventiladores, tipo de socket, perfil del disipador), pero no copian logotipos. Los nombres de modelo aparecen como texto simple. Si el equipo quiere la imagen oficial, se sube como **foto** del producto y la ficha muestra botones *Modelo 3D / Foto*.

## Dónde está cada cosa

| Archivo (`client/src/modelos3d/`) | Qué tiene |
|---|---|
| `base.js` | Texturas (circuito impreso, aluminio cepillado, etiquetas), materiales y ayudas: `caja`, `rcaja` (caja redondeada), `cil`, `extruir`, `repetir` (muchas copias en una sola malla), `ventilador`, `contactos` |
| `procesadores.js` | Intel LGA1851 (Core Ultra), AMD AM5 (IHS con recortes) y AMD AM4 (pines por debajo) |
| `memorias.js` | Módulos DDR4/DDR5 con tres estilos de disipador: `fury`, `spectrix` (barra RGB) y `dominator` (alto, con LEDs individuales) |
| `placas.js` | Tarjetas madre E-ATX, ATX y Micro-ATX (socket, VRM, ranuras, M.2, chipset) |
| `componentes.js` | Tarjetas de video (2 o 3 ventiladores), SSD M.2, fuentes (modular o con cables fijos), ventiladores y enfriamiento líquido |
| `equipos.js` | PCs armadas (usan las piezas anteriores a escala real), monitor, teclado y mouse, escritorio, silla y cajas de software |
| `lista.js` | Lista de códigos y nombres para el selector del panel (no carga three.js) |
| `index.js` | Junta todos los modelos; `construirModelo(codigo)` los centra y prepara para desarmarse |
| `escenario.js` | Luces, reflejos, sombra y cámara; lo comparten el visor y las miniaturas |
| `miniaturas.js` | Dibuja cada pieza una sola vez en un lienzo oculto y guarda la imagen para el catálogo |

Componentes de React: `components/VisorPieza.jsx` (visor con giro, zoom y desarmado) y `components/Miniatura3D.jsx` (imagen para las tarjetas).

## Unidades y orientación

- 1 unidad = **1 centímetro**. Usa medidas reales (una RAM mide 13.33 cm de largo, una tarjeta madre ATX 30.5 × 24.4 cm).
- Cada función regresa `{ g, partes }`: `g` es el grupo con la pieza y `partes` la lista de lo que se separa al desarmar: `{ obj, off: [x, y, z] }` (hacia dónde y cuánto se mueve).
- No hace falta centrarla: `construirModelo` la pone sobre el piso y ajusta la cámara.

## Agregar una pieza nueva (ejemplo: otra memoria RAM)

1. Si se parece a una que ya existe, solo agrega una entrada con otros parámetros. En `memorias.js`:

   ```js
   'ram-trident-z5': { nombre: 'G.Skill Trident Z5 RGB DDR5', crear: () => memoria({ ddr: 5, estilo: 'spectrix', base: '#2b2f34', acento: '#c9ced3', marca: 'TRIDENT', linea: ' Z5', detalle: 'DDR5-6400 · 16 GB', rgb: true }) },
   ```

2. Agrega el código y el nombre en `lista.js` (en su grupo).
3. Revisa cómo se ve en `http://localhost:5173/galeria-3d`.
4. En el panel, edita el producto y elige el modelo en **Modelo 3D hecho con código** (o pon el código en la columna `modelo_codigo` del CSV).

Si la pieza es de un tipo nuevo, copia la función más parecida y ve cambiando medidas y piezas. Revisa siempre que no queden partes encimadas al desarmar.

## Productos agregados en noviembre de 2026

Procesadores Core Ultra 9 285K, Core Ultra 7 265K, Ryzen 9 9950X3D y Ryzen 5 5600G; tarjetas madre ASUS ROG Maximus Z890 Extreme (Intel LGA1851) y MSI B550M PRO-VDH WiFi (**AMD AM4**, para Ryzen 3000/5000 como el 5600G); memorias Kingston FURY Beast DDR4 y DDR5, ADATA XPG Spectrix D35G y Corsair Dominator Titanium RGB; SSD SanDisk Optimus 5100 y Samsung 990 PRO; fuentes MSI MAG A650BN y Gigabyte UD850GM; tarjetas de video RTX 5060, RTX 5060 Ti 16 GB y Radeon RX 9070 XT.

> Los **precios y existencias** de estos productos son estimados para la demo. El responsable de catálogo debe verificarlos con proveedores antes de presentar.

## Rendimiento

- Las miniaturas se dibujan una por una, solo cuando la tarjeta aparece en pantalla, y se reutilizan.
- Todo el código 3D se descarga hasta que hace falta (la página principal no lo carga si no hay tarjetas visibles).
- En computadoras sin aceleración gráfica (o en máquinas virtuales) las miniaturas tardan más en aparecer; con una GPU normal salen casi al instante.
