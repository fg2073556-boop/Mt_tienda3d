-- Pagos con Openpay: tarjeta (token), transferencia SPEI y efectivo en tienda.
-- Nuevo método 'tarjeta' (cobro real con Openpay); 'tarjeta_prueba' se queda para cuando no hay llaves.
ALTER TABLE pedido DROP CONSTRAINT IF EXISTS pedido_metodo_pago_check;
ALTER TABLE pedido ADD CONSTRAINT pedido_metodo_pago_check
    CHECK (metodo_pago IN ('tarjeta_prueba', 'tarjeta', 'transferencia', 'tienda'));

ALTER TABLE pedido ADD COLUMN IF NOT EXISTS pago_proveedor VARCHAR(20);   -- 'openpay' o NULL (simulado)
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS pago_id        VARCHAR(60);   -- id del cargo en Openpay
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS pago_estado    VARCHAR(30);   -- completed, in_progress, cancelled, failed…
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS pago_datos     JSONB;         -- CLABE, referencia, tarjeta (solo últimos 4)…
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS pagado_en      TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pedido_pago_id ON pedido(pago_id) WHERE pago_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pedido_pago_pendiente ON pedido(creado_en) WHERE pago_id IS NOT NULL AND estado = 'pendiente';
