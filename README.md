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
| Extra: asesor con Gemini | Recomienda equipo según el uso del cliente | Listo (necesita llave de API) |

## Cómo correrlo (primera vez)

Necesitas **Docker Desktop**, **Node.js 20+** y **Git**.

**1. Base de datos**

```bash
cp .env.example .env              # en Windows: copy .env.example .env
docker compose up -d
```

La primera vez, Docker crea las tablas (`database/schema.sql`) y carga el catálogo de ejemplo (`database/seed.sql`). Usa el puerto **5433** para no chocar con otro PostgreSQL que ya tengas en el 5432.

**2. Backend** (en otra terminal)

```bash
cd server
npm install
cp .env.example .env              # pon la MISMA contraseña que en el .env de la raíz
npm run crear-usuarios            # crea la cuenta de administrador y la de vendedor
npm run dev                       # API en http://localhost:3001
```

**3. Frontend** (en otra terminal)

```bash
cd client
npm install
npm run dev                       # tienda en http://localhost:5173
```

El panel está en http://localhost:5173/login con las cuentas que pusiste en `server/.env`.

## Estructura

```
docker-compose.yml     PostgreSQL 16 en Docker
.env.example           Usuario y contraseña de la base (para Docker)
database/
  schema.sql           Tablas: usuario, categoria, producto, pedido, pedido_detalle, alerta_stock
  seed.sql             Catálogo y pedidos de ejemplo
server/                API REST (Node + Express)
  src/index.js         Arranque
  src/app.js           Rutas y manejo de errores
  src/db.js            Conexión a PostgreSQL y transacciones
  src/routes/          catalogo, pedidos, asesor, auth, admin
  src/services/        stock.js (alertas) y asesor.js (Gemini)
  src/middleware/      auth.js: JWT y permisos por rol
  scripts/             crear-usuarios.js
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
| `POST /api/auth/login` | Público | Devuelve el token JWT |
| `GET /api/admin/resumen` | Ambos roles | Ventas del día, pedidos, alertas |
| `POST/PUT/DELETE /api/admin/productos` | Administrador | Alta, edición (con foto y .glb) y baja |
| `PATCH /api/admin/productos/:id/existencias` | Ambos roles | Sumar o restar existencias |
| `PATCH /api/admin/pedidos/:id/estado` | Ambos roles | Cambiar estado; cancelar regresa piezas |

## Reglas de negocio

- La compra es todo o nada: si un producto ya no alcanza al pagar, no se guarda el pedido.
- Al pagar se descuentan existencias. Si un producto llega a 0 o baja del mínimo, se crea una alerta en el panel.
- Al cancelar un pedido, las piezas regresan al inventario.
- Eliminar un producto lo oculta (borrado suave): los pedidos anteriores conservan nombre y precio.

## Modelos 3D

En el panel, edita un producto, elige su **pieza en la escena 3D** y sube su `.glb`. La escena reemplaza la pieza dibujada por ese modelo, y la ficha del producto lo muestra con realidad aumentada en celulares compatibles. Para el gabinete sube el modelo **vacío por dentro**. Los prompts para generarlos están en `docs/prompts-3d.md`.

## Pruebas

```bash
docker exec -it mt_tienda_db createdb -U mt_admin mt_tienda_test
cd server
DB_NAME=mt_tienda_test npm test              # PowerShell: $env:DB_NAME="mt_tienda_test"; npm test
```

## Equipo y responsabilidades

| Rol | Responsable | Entregables |
|---|---|---|
| Líder técnico y desarrollo | Fernando González Méndez | Código, revisión de cambios |
| Responsable 3D | Por asignar | Modelos `.glb` de cada pieza, subidos desde el panel |
| Responsable de catálogo | Por asignar | `datos/catalogo.csv` completo, fotos y descripciones |
| Diseño y marca | Por asignar | Logo, banners, presentación |
| Pruebas y documentación | Por asignar | `docs/pruebas.md`, manual de usuario, reporte de errores |

Lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de subir tu primer cambio.
