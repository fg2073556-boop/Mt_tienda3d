-- Avisos de reposición: a quién se le manda el correo y a qué proveedor se le pide por WhatsApp.
-- Es una sola fila (id = 1) que el administrador edita desde el panel.
CREATE TABLE IF NOT EXISTS ajuste_reposicion (
    id                  INT          PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    correo_destino      VARCHAR(400),             -- uno o varios correos separados por coma
    aviso_automatico    BOOLEAN      NOT NULL DEFAULT TRUE,
    proveedor_nombre    VARCHAR(120),
    proveedor_whatsapp  VARCHAR(20),              -- solo dígitos, con lada de país (52...)
    actualizado_en      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
INSERT INTO ajuste_reposicion (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Cuándo se mandó el correo de cada alerta (NULL = falta avisar)
ALTER TABLE alerta_stock ADD COLUMN IF NOT EXISTS notificada_en TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_alerta_sin_aviso ON alerta_stock(creada_en) WHERE notificada_en IS NULL;
