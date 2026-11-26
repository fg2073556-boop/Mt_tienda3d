# Diagramas

| Diagrama | Archivo |
|---|---|
| Flujo de compra del cliente | [flujo-compra.png](flujo-compra.png) |
| Flujo del panel (administrador y vendedor) | [flujo-panel.png](flujo-panel.png) |
| Base de datos (entidad-relación) | [base-de-datos.png](base-de-datos.png) |

Se generan con los scripts de `fuente/` (Python + Playwright) a partir del código real:

```bash
pip install playwright && playwright install chromium
cd docs/diagramas && python fuente/flujos.py && python fuente/base_de_datos.py
```

Si cambia una tabla en `database/schema.sql` o un paso del proceso, actualiza el script y vuelve a generar la imagen.

## Base de datos

![Diagrama entidad-relación](base-de-datos.png)

PostgreSQL 16 con 11 tablas: `database/schema.sql` más las migraciones `database/migraciones/001` a `010`, que el servidor aplica solo al arrancar.

| Módulo | Tablas |
|---|---|
| Catálogo e inventario | `categoria`, `producto`, `alerta_stock`, `ajuste_reposicion` |
| Ventas y pagos | `pedido`, `pedido_detalle` |
| Cuentas | `usuario` (administrador, vendedor y cliente) |
| Envíos | `zona_envio`, `municipio_envio`, `codigo_postal` |
| Sistema | `migracion_hecha` (migraciones que corren una sola vez) |

La misma estructura en Mermaid (GitHub la dibuja sola):

```mermaid
erDiagram
    CATEGORIA ||--o{ PRODUCTO : agrupa
    PRODUCTO ||--o{ ALERTA_STOCK : "genera (CASCADE)"
    PRODUCTO |o--o{ PEDIDO_DETALLE : "se vende en (SET NULL)"
    PEDIDO ||--|{ PEDIDO_DETALLE : "contiene (CASCADE)"
    USUARIO |o--o{ PEDIDO : "compra (SET NULL)"
    ZONA_ENVIO |o--o{ MUNICIPIO_ENVIO : cubre
    MUNICIPIO_ENVIO ||--o{ CODIGO_POSTAL : tiene

    CATEGORIA {
        int id PK
        varchar nombre
        varchar slug UK
    }
    PRODUCTO {
        int id PK
        int categoria_id FK
        varchar nombre
        varchar slug UK
        text descripcion
        numeric precio
        int existencias
        int stock_minimo
        varchar imagen
        varchar modelo_3d
        varchar pieza_3d
        varchar modelo_codigo
        jsonb especificaciones
        boolean activo
        timestamptz eliminado_en
    }
    ALERTA_STOCK {
        int id PK
        int producto_id FK
        varchar tipo "agotado o bajo"
        int existencias
        timestamptz leida_en
        timestamptz notificada_en
    }
    AJUSTE_REPOSICION {
        int id PK "siempre 1"
        varchar correo_destino
        boolean aviso_automatico
        varchar proveedor_nombre
        varchar proveedor_whatsapp
        boolean whatsapp_automatico
    }
    USUARIO {
        int id PK
        varchar nombre
        varchar correo UK
        varchar password_hash
        varchar rol "administrador, vendedor o cliente"
        varchar telefono
        boolean activo
    }
    PEDIDO {
        int id PK
        varchar folio UK
        int usuario_id FK
        varchar cliente_nombre
        varchar cliente_correo
        varchar cliente_telefono
        text direccion
        varchar metodo_pago
        varchar estado
        numeric total
        varchar pago_proveedor
        varchar pago_id
        varchar pago_estado
        jsonb pago_datos
        timestamptz pagado_en
        char envio_cp
        varchar envio_colonia
        varchar envio_municipio
        varchar envio_zona
        numeric envio_km
        varchar envio_dias
        numeric envio_costo
    }
    PEDIDO_DETALLE {
        int id PK
        int pedido_id FK
        int producto_id FK
        varchar producto_nombre
        numeric precio_unitario
        int cantidad
        numeric subtotal
    }
    ZONA_ENVIO {
        int id PK
        varchar nombre
        numeric costo
        int dias_min
        int dias_max
        varchar color
    }
    MUNICIPIO_ENVIO {
        char cve_mun PK
        varchar nombre
        numeric lat
        numeric lon
        numeric distancia_km
        int zona_id FK
    }
    CODIGO_POSTAL {
        char cve_mun PK, FK
        char id_asenta PK
        char cp
        varchar colonia
        varchar tipo
        varchar zona_urbana
    }
```

`pedido_detalle` y los campos `envio_*` de `pedido` copian los datos al momento de la compra (nombre, precio, CP, zona y costo). Así, si después cambia un precio o una zona, o se borra un producto, el pedido no se altera.
