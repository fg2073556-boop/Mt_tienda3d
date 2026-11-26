-- Modelos 3D hechos con código y ficha técnica de cada producto.
-- Se puede ejecutar varias veces sin problema (npm run migrar).
ALTER TABLE producto ADD COLUMN IF NOT EXISTS modelo_codigo VARCHAR(40);
ALTER TABLE producto ADD COLUMN IF NOT EXISTS especificaciones JSONB NOT NULL DEFAULT '[]'::jsonb;
