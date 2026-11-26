# M&T · Tienda virtual 3D (reto COM-1)

Tienda en línea para vender soluciones integrales de PC (equipo, software y mobiliario) a estudiantes, ingenieros y empresarios de la región. El cliente puede ver el equipo en 3D, desarmarlo pieza por pieza y comprar cada parte.

Tecnologías: **React + Bootstrap**, **Node.js + Express** (API REST con JWT) y **PostgreSQL en Docker**.

## Módulos obligatorios del reto

| Módulo | Qué hace | Estado |
|---|---|---|
| Catálogo de productos | Alta, edición y baja con nombre, foto, precio y categoría | Listo y probado |
| Carrito y pago | Agregar productos y completar la compra | Listo y probado (pago en modo de prueba) |
| Gestión de stock | Existencias y aviso cuando un producto se agota | Listo y probado |
| Panel del vendedor | Ver pedidos y cambiar su estado | Listo y probado |
| Extra: vista 3D | Escena con la PC desarmable; acepta modelos .glb | Listo y probado |
| Extra: piezas 3D realistas | 37 modelos hechos con código (CPU, RAM, tarjetas madre, GPU, SSD, fuentes, PCs, mobiliario, software) en catálogo, ficha y galería | Listo |
| Extra: asesor con Gemini | Recomienda equipo según el uso del cliente | Listo (necesita llave de API) |
| Extra: IA en el panel | Redacta descripciones y resume fichas técnicas en PDF | Listo (necesita llave de API) |
| Extra: seguimiento | El cliente consulta su pedido con folio y correo | Listo y probado |

## Cómo correrlo

Necesitas **Docker Desktop** (abierto), **Node.js 20+** y **Git**.

**La primera vez** (en la carpeta del proyecto):

```bash
npm run instalar          # instala todo (raíz, server y client)
npm run preparar          # crea los .env con contraseñas aleatorias y te muestra las del panel
npm run bd                # levanta PostgreSQL en Docker y carga el catálogo de ejemplo
npm run crear-usuarios    # opcional: el servidor ya crea las cuentas de server/.env al arrancar
```

**Cada vez que vayas a trabajar:**

```bash
npm run bd                # si Docker no la tiene prendida
npm run dev               # arranca la API y la tienda juntas
```

Abre http://localhost:5173. El panel está en http://localhost:5173/login (las contraseñas están en `server/.env`).

### Comandos útiles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Arranca API (puerto 3001) y tienda (puerto 5173) en una sola terminal |
| `npm run migrar` | Agrega a una base que ya existía las columnas nuevas (modelo 3D y especificaciones). Se puede repetir |
| `npm run importar-catalogo` | Carga `datos/catalogo.csv` a la base (agrega `-- --prueba` para solo ver los cambios) |
| `npm run crear-usuarios` | Crea o actualiza las cuentas del panel con los datos de `server/.env` (el servidor también lo hace solo al arrancar o al guardar `server/.env`) |
| `npm test` | Corre las pruebas de la API (ver sección Pruebas) |
| `npm run bd:detener` | Apaga la base de datos de Docker |

**Si el puerto 3001 está ocupado** por otro programa, la API te avisa. Cambia `PORT` en `server/.env` (por ejemplo a 3002); la tienda lo detecta sola.

## Estructura

```
package.json           Comandos para todo el proyecto (npm run dev, preparar, bd…)
scripts/preparar.js    Crea los .env con contraseñas que coinciden
docker-compose.yml     PostgreSQL 16 en Docker
.env.example           Usuario y contraseña de la base (para Docker)
database/
  schema.sql           Tablas: usuario, categoria, producto, pedido, pedido_detalle, alerta_stock
  seed.sql             Catálogo y pedidos de ejemplo
server/                API REST (Node + Express)
  src/index.js         Arranque
  src/app.js           Rutas y manejo de errores
  src/db.js            Conexión a PostgreSQL y transacciones
  src/routes/          catalogo, pedidos, asesor, auth, admin, ia
  src/services/        stock.js (alertas), gemini.js, asesor.js, catalogo-csv.js
  src/middleware/      auth.js: JWT y permisos por rol
  scripts/             crear-usuarios.js, importar-catalogo.js
  test/                Pruebas de los 4 módulos
  uploads/             Fotos y modelos .glb que sube el panel
client/                Frontend (React + Vite + Bootstrap)
  src/context/         AuthContext (usuario y rol) y CartContext (carrito)
  src/components/      Escena3D, TarjetaProducto, RutaProtegida…
  src/pages/           Tienda, Producto, Carrito, Pagar, Login
  src/pages/panel/     Panel con menú lateral por rol
prototipo/             Maqueta en HTML sin base de datos (para enseñar la idea rápido)
assets/ diseno/ docs/  Modelos 3D, diseño y documentación del equipo
datos/catalogo.csv     Catálogo de ejemplo en hoja de cálculo
```

## Roles

| Rol | Puede |
|---|---|
| Administrador | Todo: alta, edición y baja de productos, existencias, pedidos y alertas |
| Vendedor | Ver el resumen, ajustar existencias y cambiar el estado de los pedidos |

## API

| Método y ruta | Acceso | Qué hace |
|---|---|---|
| `GET /api/productos?categoria=&q=` | Público | Catálogo con filtros |
| `GET /api/productos/:slug` | Público | Ficha de un producto |
| `GET /api/piezas` | Público | Producto de cada pieza de la escena 3D |
| `POST /api/pedidos` | Público | Compra todo-o-nada; descuenta existencias |
| `POST /api/asesor` | Público | Recomendación con Gemini (o reglas sin llave) |
| `POST /api/pedidos/seguimiento` | Público | Estado del pedido con folio y correo |
| `POST /api/auth/login` | Público | Devuelve el token JWT |
| `GET /api/admin/resumen` | Ambos roles | Ventas del día, pedidos, alertas |
| `POST/PUT/DELETE /api/admin/productos` | Administrador | Alta, edición (con foto y .glb) y baja |
| `PATCH /api/admin/productos/:id/existencias` | Ambos roles | Sumar o restar existencias |
| `PATCH /api/admin/pedidos/:id/estado` | Ambos roles | Cambiar estado; cancelar regresa piezas |
| `POST /api/admin/ia/descripcion` | Administrador | Redacta la descripción de un producto con Gemini |
| `POST /api/admin/ia/resumir-ficha` | Administrador | Explica una ficha técnica en PDF con Gemini |
| `GET /api/admin/reposicion` | Ambos roles | Inventario con estado (agotado, por acabarse, sano) y cantidad sugerida |
| `PUT /api/admin/reposicion/ajuste` | Administrador | Correo(s) de aviso, proveedor y su WhatsApp |
| `PATCH /api/admin/reposicion/productos/:id/minimo` | Ambos roles | Cambiar el mínimo de un producto |
| `POST /api/admin/reposicion/correo` | Ambos roles | Mandar ahora el reporte de lo que falta |
| `POST /api/admin/reposicion/mensaje` | Ambos roles | Borrador de WhatsApp para el proveedor (Gemini o mensaje base) |
| `POST /api/admin/reposicion/whatsapp` | Ambos roles | Manda el pedido al proveedor por WhatsApp (CallMeBot o Meta) |
| `POST /api/admin/reposicion/reponer` | Ambos roles | Registrar la llegada de varios productos a la vez |

## Reglas de negocio

- La compra es todo o nada: si un producto ya no alcanza al pagar, no se guarda el pedido.
- Al pagar se descuentan existencias. Si un producto llega a 0 o baja del mínimo, se crea una alerta en el panel.
- Al cancelar un pedido, las piezas regresan al inventario.
- Cada minuto el servidor junta las alertas nuevas y manda **un solo correo** con todo lo que falta (no un correo por producto). Las alertas de más de 24 horas que nunca se mandaron ya no se envían.
- Eliminar un producto lo oculta (borrado suave): los pedidos anteriores conservan nombre y precio.

## Modelos 3D

**Fotos del catálogo:** las fotos de los productos viven en `assets/imagenes/productos/<slug>.webp` y se asignan solas al arrancar el servidor (una sola vez, sin pisar fotos subidas desde el panel). En el catálogo y en la ficha, la **foto es la vista principal**; al tocarla se abre el **modelo 3D girando** (en el catálogo, en una ventana con "Ver detalles" y "Agregar").


**Piezas hechas con código (recomendado).** Cada producto puede tener un *modelo 3D hecho con código* (three.js, sin archivos ni programas de pago): se elige en el panel al editar el producto. Se ve en tres lugares:

- **Catálogo:** la tarjeta muestra la imagen 3D de la pieza (si el producto no tiene foto).
- **Ficha del producto:** visor para girar, acercar y desarmar la pieza, con su tabla de especificaciones.
- **Showroom de la página principal:** la PC Fénix, el escritorio, el monitor, el teclado y la silla están hechos con estas mismas piezas; cada una se puede tocar.
- **Galería interna:** http://localhost:5173/galeria-3d muestra todas las piezas (no aparece en el menú de la tienda; se abre desde el panel).

Cómo están hechas y cómo agregar una nueva: [docs/modelos-3d.md](docs/modelos-3d.md).

**Modelos .glb.** En el panel, edita un producto, elige su **pieza en la escena 3D** y sube su `.glb`. La escena reemplaza la pieza dibujada por ese modelo, y la ficha del producto lo muestra con realidad aumentada en celulares compatibles. Para el gabinete sube el modelo **vacío por dentro**. Los prompts para generarlos están en `docs/prompts-3d.md`.

## Reposición y avisos

En el panel, **Reposición** muestra lo que se está acabando, cuánto pedir (lo que falta para llegar al doble del mínimo), el mínimo de cada producto (editable) y el pedido al proveedor:

1. Marca los productos y ajusta las cantidades.
2. **Redactar mensaje con Gemini** arma el pedido para el proveedor; lo puedes editar y abrir en WhatsApp con el texto listo (enlace `wa.me`, sin costo).
3. Cuando llega la mercancía, **Ya llegó: sumar al inventario** suma todo de una vez.

Para que salgan los correos, pon en `server/.env` los datos del servidor de correo (con Gmail, una *contraseña de aplicación*):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-cuenta@gmail.com
SMTP_PASS=contraseña-de-aplicacion
```

y en el panel, en **Ajustes de avisos**, el correo que recibe los avisos. Las claves nunca van en el código.

### WhatsApp automático al proveedor

Cuando algo se agota o llega a su mínimo, el servidor también le manda al proveedor el pedido por WhatsApp (solo lo que se acaba de acabar, con la cantidad sugerida). Desde el panel también se puede mandar directo con **Enviar por WhatsApp ahora**. Se elige el servicio con `WHATSAPP_MODO` en `server/.env`:

| Modo | Para qué | Qué necesita |
|---|---|---|
| `make` | Mandar desde tu propio WhatsApp | Escenario de Make *M&T · WhatsApp al proveedor cuando algo se acaba* (webhook → 2Chat) con tu WhatsApp conectado por QR; la dirección del webhook va en `WHATSAPP_MAKE_WEBHOOK` |
| `callmebot` | Demo o avisos al equipo (gratis, solo uso personal) | Desde el WhatsApp que recibe, mandar *I allow callmebot to send me messages* al bot de callmebot.com y poner la llave en `WHATSAPP_CALLMEBOT_APIKEY` |
| `meta` | Proveedor real (API oficial de WhatsApp Business) | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` y una plantilla aprobada en `WHATSAPP_PLANTILLA` con `{{1}}` proveedor y `{{2}}` lista |

Sin `WHATSAPP_MODO`, el pedido se abre en WhatsApp con el texto listo para que lo envíe una persona.

## Pruebas

```bash
docker exec -it mt_tienda_db createdb -U mt_admin mt_tienda_test
cd server
DB_NAME=mt_tienda_test npm test              # PowerShell: $env:DB_NAME="mt_tienda_test"; npm test
```

Son 22 pruebas: cuentas, catálogo, compra, stock, roles, pedidos, seguimiento, IA, reposición y WhatsApp. Gemini, el correo y WhatsApp se simulan en las pruebas, así que no gastan cuota ni mandan correos.

## Usar la IA (Gemini)

1. Crea tu llave en https://aistudio.google.com
2. Pégala en `GEMINI_API_KEY` dentro de `server/.env` y reinicia `npm run dev`.

Qué usa la IA en el proyecto, uno por cada reto del hackathon:

| Reto | Dónde |
|---|---|
| Comprender el lenguaje y asesorar | Asesor M&T en la tienda |
| Analizar información compleja | Panel → editar producto → Analizar ficha técnica (PDF) |
| Generar contenido | Panel → editar producto → Redactar con IA |

Si el servidor dice que el modelo no existe, cambia `GEMINI_MODEL` en `server/.env` por uno disponible para tu llave.

## Catálogo desde la hoja de cálculo

El responsable de catálogo edita `datos/catalogo.csv` (se abre con Excel o Google Sheets; guárdalo como CSV UTF-8). Las fotos van en `assets/imagenes/productos/` y en la columna `imagen` se pone solo el nombre del archivo. Luego:

```bash
npm run importar-catalogo -- --prueba    # revisa qué va a cambiar
npm run importar-catalogo                # lo aplica
```

Los productos se reconocen por nombre: si existe se actualiza, si no se crea. Nada se borra.

Columnas opcionales: `modelo_codigo` (el código del modelo 3D, por ejemplo `gpu-rtx-5060-ti`; la lista está en `client/src/modelos3d/lista.js`) y `especificaciones`, en una sola celda separadas por barras: `Socket: AM5 | TDP: 65 W`.

**Si ya tenías la base de datos de antes**, actualízala así (no borra nada):

```bash
npm run migrar               # agrega las columnas nuevas
npm run importar-catalogo    # carga los 17 productos nuevos y las especificaciones
```

> Ojo: importar el CSV también deja las existencias como dice el CSV.

## Equipo y responsabilidades

| Rol | Responsable | Entregables |
|---|---|---|
| Líder técnico y desarrollo | Fernando González Méndez | Código, revisión de cambios |
| Responsable 3D | Por asignar | Piezas 3D con código ([docs/modelos-3d.md](docs/modelos-3d.md)) y modelos `.glb` opcionales |
| Responsable de catálogo | Por asignar | `datos/catalogo.csv` completo, fotos y descripciones |
| Diseño y marca | Por asignar | Logo, banners, presentación |
| Pruebas y documentación | Por asignar | `docs/pruebas.md`, manual de usuario, reporte de errores |

Lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de subir tu primer cambio.

## Documentación

| Documento | Para qué |
|---|---|
| [docs/arquitectura.md](docs/arquitectura.md) | Diagramas del sistema, modelo de datos, flujo de compra y decisiones |
| [docs/manual-usuario.md](docs/manual-usuario.md) | Cómo se usa la tienda y el panel, con capturas |
| [docs/guion-demo.md](docs/guion-demo.md) | Demo de 3 minutos, plan B y preguntas de los jueces |
| [docs/pruebas.md](docs/pruebas.md) | Lista de pruebas manuales |
| [docs/tareas-equipo.md](docs/tareas-equipo.md) | Tareas por rol, listas para convertir en issues |
| [docs/modelos-3d.md](docs/modelos-3d.md) | Cómo están hechas las piezas 3D con código y cómo agregar una |
| [docs/prompts-3d.md](docs/prompts-3d.md) | Prompts para generar las piezas 3D |
