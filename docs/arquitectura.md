# Arquitectura

## Vista general

```mermaid
flowchart LR
    C[Cliente<br>navegador o celular] -->|HTTP| W[Frontend React<br>Vite · Bootstrap · three.js]
    V[Vendedor / Administrador] -->|HTTP + JWT| W
    W -->|/api REST| A[API Node + Express]
    A -->|SQL| D[(PostgreSQL 16<br>en Docker)]
    A -->|HTTPS| G[API de Gemini]
    A -->|archivos| U[/uploads<br>fotos y modelos .glb/]
```

| Capa | Tecnología | Carpeta |
|---|---|---|
| Interfaz | React 19, React Router, Bootstrap 5, three.js para la escena 3D, `<model-viewer>` para realidad aumentada | `client/` |
| API | Node.js 20+, Express 5, JWT para sesiones, bcrypt para contraseñas, multer para subir archivos | `server/` |
| Datos | PostgreSQL 16 en Docker | `database/` |
| IA | API de Gemini (`generateContent`) | `server/src/services/gemini.js` |

## Modelo de datos

```mermaid
erDiagram
    CATEGORIA ||--o{ PRODUCTO : agrupa
    PRODUCTO ||--o{ PEDIDO_DETALLE : "se vende en"
    PEDIDO ||--|{ PEDIDO_DETALLE : contiene
    PRODUCTO ||--o{ ALERTA_STOCK : genera
    USUARIO {
        int id PK
        string correo UK
        string password_hash
        string rol "administrador | vendedor"
    }
    CATEGORIA {
        int id PK
        string nombre
        string slug UK
    }
    PRODUCTO {
        int id PK
        int categoria_id FK
        string nombre
        string slug UK
        numeric precio
        int existencias
        int stock_minimo
        string imagen
        string modelo_3d
        string pieza_3d
        timestamptz eliminado_en "borrado suave"
    }
    PEDIDO {
        int id PK
        string folio UK
        string cliente_correo
        string metodo_pago
        string estado
        numeric total
    }
    PEDIDO_DETALLE {
        int id PK
        int pedido_id FK
        int producto_id FK
        string producto_nombre "copia al comprar"
        numeric precio_unitario "copia al comprar"
        int cantidad
    }
    ALERTA_STOCK {
        int id PK
        int producto_id FK
        string tipo "agotado | bajo"
        timestamptz leida_en
    }
```

## Flujo de compra (todo o nada)

```mermaid
sequenceDiagram
    participant C as Cliente
    participant W as React
    participant A as API
    participant D as PostgreSQL
    C->>W: Confirmar compra
    W->>A: POST /api/pedidos (carrito)
    A->>D: BEGIN
    A->>D: SELECT productos ... FOR UPDATE
    alt algún producto no alcanza
        A->>D: ROLLBACK
        A-->>W: 409 "solo quedan N"
    else todo alcanza
        A->>D: INSERT pedido y detalle
        A->>D: UPDATE existencias (+ alerta si se agota o queda poco)
        A->>D: COMMIT
        A-->>W: 201 folio MT-000NN
    end
```

`FOR UPDATE` bloquea las filas de los productos mientras dura la compra, así dos clientes no pueden comprar la última pieza al mismo tiempo.

## Decisiones importantes

| Decisión | Por qué |
|---|---|
| Las existencias solo cambian en `services/stock.js` | Así siempre se genera la alerta de agotado o de stock bajo, venga el cambio de una compra, del panel, de una cancelación o del importador |
| El detalle del pedido guarda nombre y precio | Si después cambia el precio o se elimina el producto, el pedido viejo sigue diciendo lo que se cobró |
| Borrado suave de productos | Eliminar no rompe pedidos anteriores |
| Carrito en el navegador | No requiere cuenta para comprar; el servidor vuelve a validar existencias al pagar |
| Seguimiento pide folio y correo, por POST | Nadie puede ver pedidos ajenos adivinando folios, y el correo no queda en la URL ni en el historial |
| IA con respaldo | Si no hay llave o Gemini falla, el asesor sigue funcionando con reglas; las herramientas del panel explican qué falta |
| three.js y el panel se cargan aparte | La tienda abre con 284 kB en lugar de 836 kB |

## Seguridad

- Contraseñas con bcrypt; sesiones con JWT que expiran a las 8 horas.
- Permisos revisados en el servidor, no solo escondiendo botones: el vendedor recibe 403 si intenta acciones de administrador.
- Consultas SQL siempre con parámetros (`$1`, `$2`), nunca concatenando texto del usuario.
- Archivos subidos: solo imágenes (JPG, PNG, WEBP, GIF), `.glb` y PDF, con límite de tamaño y nombres aleatorios.
- Límite de consultas al asesor y al seguimiento por minuto.
- Las llaves y contraseñas viven en `.env`, que Git ignora.
