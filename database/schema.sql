-- =========================================================
-- M&T Tienda 3D · esquema PostgreSQL
-- Docker lo ejecuta solo la primera vez que crea la base.
-- Para recrearla: docker compose down -v && docker compose up -d
-- =========================================================

CREATE TABLE usuario (
    id             SERIAL PRIMARY KEY,
    nombre         VARCHAR(120) NOT NULL,
    correo         VARCHAR(150) NOT NULL UNIQUE,
    password_hash  VARCHAR(100) NOT NULL,
    -- administrador y vendedor entran al panel; cliente compra en la tienda
    rol            VARCHAR(20)  NOT NULL CONSTRAINT usuario_rol_check CHECK (rol IN ('administrador', 'vendedor', 'cliente')),
    telefono       VARCHAR(20),
    activo         BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE categoria (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(60) NOT NULL,
    slug    VARCHAR(70) NOT NULL UNIQUE
);

CREATE TABLE producto (
    id              SERIAL PRIMARY KEY,
    categoria_id    INT           NOT NULL REFERENCES categoria(id),
    nombre          VARCHAR(150)  NOT NULL,
    slug            VARCHAR(170)  NOT NULL UNIQUE,
    descripcion     TEXT,
    precio          NUMERIC(10,2) NOT NULL CHECK (precio > 0),
    existencias     INT           NOT NULL DEFAULT 0 CHECK (existencias >= 0),
    stock_minimo    INT           NOT NULL DEFAULT 2 CHECK (stock_minimo >= 0),
    imagen          VARCHAR(255),           -- ruta dentro de /uploads
    modelo_3d       VARCHAR(255),           -- archivo .glb dentro de /uploads
    -- Pieza de la escena 3D: gab, cpu, cooler, ram, gpu, ssd, psu, fans, monitor, kb, desk
    pieza_3d        VARCHAR(20),
    -- Modelo 3D hecho con código (client/src/modelos3d), p. ej. 'gpu-rtx-5060-ti'
    modelo_codigo   VARCHAR(40),
    -- Ficha técnica: lista de pares ["Dato", "Valor"]
    especificaciones JSONB        NOT NULL DEFAULT '[]'::jsonb,
    activo          BOOLEAN       NOT NULL DEFAULT TRUE,
    eliminado_en    TIMESTAMPTZ,            -- borrado suave: los pedidos viejos lo conservan
    creado_en       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE pedido (
    id                SERIAL PRIMARY KEY,
    folio             VARCHAR(20)   UNIQUE,
    usuario_id        INT           REFERENCES usuario(id) ON DELETE SET NULL,   -- cliente que compró
    cliente_nombre    VARCHAR(120)  NOT NULL,
    cliente_correo    VARCHAR(150)  NOT NULL,
    cliente_telefono  VARCHAR(20),
    direccion         TEXT          NOT NULL,
    metodo_pago       VARCHAR(30)   NOT NULL CONSTRAINT pedido_metodo_pago_check
                      CHECK (metodo_pago IN ('tarjeta_prueba', 'tarjeta', 'transferencia', 'tienda')),
    estado            VARCHAR(20)   NOT NULL DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente', 'pagado', 'preparacion', 'enviado', 'entregado', 'cancelado')),
    total             NUMERIC(10,2) NOT NULL DEFAULT 0,
    -- Pago con Openpay (vacío cuando el pago es simulado)
    pago_proveedor    VARCHAR(20),
    pago_id           VARCHAR(60),
    pago_estado       VARCHAR(30),
    pago_datos        JSONB,                  -- CLABE, referencia, tarjeta (solo últimos 4)…
    pagado_en         TIMESTAMPTZ,
    -- Envío dentro de Puebla (vacío si solo se compró software). Zonas y códigos postales:
    -- tablas zona_envio, municipio_envio y codigo_postal (database/migraciones/008 y 009)
    envio_cp          CHAR(5),
    envio_colonia     VARCHAR(120),
    envio_municipio   VARCHAR(80),
    envio_zona        VARCHAR(60),
    envio_km          NUMERIC(6,1),
    envio_dias        VARCHAR(20),
    envio_costo       NUMERIC(8,2)  NOT NULL DEFAULT 0,
    creado_en         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    actualizado_en    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Se guarda nombre y precio del momento de la compra
CREATE TABLE pedido_detalle (
    id               SERIAL PRIMARY KEY,
    pedido_id        INT           NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
    producto_id      INT           REFERENCES producto(id) ON DELETE SET NULL,
    producto_nombre  VARCHAR(150)  NOT NULL,
    precio_unitario  NUMERIC(10,2) NOT NULL,
    cantidad         INT           NOT NULL CHECK (cantidad > 0),
    subtotal         NUMERIC(10,2) NOT NULL
);

CREATE TABLE alerta_stock (
    id           SERIAL PRIMARY KEY,
    producto_id  INT         NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    tipo         VARCHAR(10) NOT NULL CHECK (tipo IN ('agotado', 'bajo')),
    existencias  INT         NOT NULL,
    leida_en     TIMESTAMPTZ,
    notificada_en TIMESTAMPTZ,              -- cuándo se mandó por correo (NULL = falta avisar)
    creada_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Avisos de reposición: a quién se manda el correo y a qué proveedor se le pide por WhatsApp (una sola fila)
CREATE TABLE ajuste_reposicion (
    id                  INT          PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    correo_destino      VARCHAR(400),             -- uno o varios correos separados por coma
    aviso_automatico    BOOLEAN      NOT NULL DEFAULT TRUE,
    proveedor_nombre    VARCHAR(120),
    proveedor_whatsapp  VARCHAR(20),              -- solo dígitos, con lada de país (52...)
    whatsapp_automatico BOOLEAN      NOT NULL DEFAULT TRUE,
    actualizado_en      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
INSERT INTO ajuste_reposicion (id) VALUES (1);

CREATE INDEX idx_producto_categoria ON producto(categoria_id);
CREATE INDEX idx_producto_pieza     ON producto(pieza_3d) WHERE eliminado_en IS NULL;
CREATE INDEX idx_pedido_estado      ON pedido(estado);
CREATE INDEX idx_pedido_creado      ON pedido(creado_en DESC);
CREATE INDEX idx_pedido_usuario     ON pedido(usuario_id, creado_en DESC);
CREATE UNIQUE INDEX idx_pedido_pago_id ON pedido(pago_id) WHERE pago_id IS NOT NULL;
CREATE INDEX idx_pedido_pago_pendiente ON pedido(creado_en) WHERE pago_id IS NOT NULL AND estado = 'pendiente';
CREATE INDEX idx_detalle_pedido     ON pedido_detalle(pedido_id);
CREATE INDEX idx_alerta_no_leida    ON alerta_stock(creada_en DESC) WHERE leida_en IS NULL;
CREATE INDEX idx_alerta_sin_aviso   ON alerta_stock(creada_en) WHERE notificada_en IS NULL;
