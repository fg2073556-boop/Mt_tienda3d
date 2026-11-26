-- WhatsApp automático al proveedor cuando algo se está acabando
ALTER TABLE ajuste_reposicion ADD COLUMN IF NOT EXISTS whatsapp_automatico BOOLEAN NOT NULL DEFAULT TRUE;
