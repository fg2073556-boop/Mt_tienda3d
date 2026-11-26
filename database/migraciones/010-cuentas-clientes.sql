-- Cuentas de clientes: cualquiera puede ver la tienda, pero para comprar se crea una cuenta.
-- Un solo inicio de sesión para todos; el rol decide a dónde entra (tienda o panel).
ALTER TABLE usuario DROP CONSTRAINT IF EXISTS usuario_rol_check;
ALTER TABLE usuario ADD CONSTRAINT usuario_rol_check CHECK (rol IN ('administrador', 'vendedor', 'cliente'));
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS telefono VARCHAR(20);

-- Quién hizo cada pedido (los pedidos de antes de esta función quedan sin cuenta)
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS usuario_id INT REFERENCES usuario(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pedido_usuario ON pedido(usuario_id, creado_en DESC);
