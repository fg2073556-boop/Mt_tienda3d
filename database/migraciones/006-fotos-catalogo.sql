-- Fotos del catálogo (assets/imagenes/productos/<slug>.webp, servidas en /uploads/catalogo/).
-- Se aplica UNA sola vez: si después alguien cambia o quita la foto desde el panel, no se vuelve a poner.
CREATE TABLE IF NOT EXISTS migracion_hecha (
    nombre   VARCHAR(80) PRIMARY KEY,
    hecha_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM migracion_hecha WHERE nombre = '006-fotos-catalogo') THEN
    UPDATE producto p SET imagen = 'catalogo/' || f.slug || '.webp', actualizado_en = NOW()
      FROM (VALUES
        ('monitor-27-qhd-165-hz'),
        ('pc-gamer-mt-fenix'),
        ('pc-oficina-mt-basica'),
        ('teclado-mecanico-mouse'),
        ('procesador-amd-ryzen-5-5600g'),
        ('procesador-amd-ryzen-9-9950x3d'),
        ('procesador-intel-core-ultra-7-265k'),
        ('procesador-intel-core-ultra-9-285k'),
        ('procesador-ryzen-7-7700'),
        ('tarjeta-madre-asus-rog-maximus-z890-extreme'),
        ('tarjeta-madre-msi-b550m-pro-vdh-wifi'),
        ('memoria-32-gb-ddr5-rgb-2x16'),
        ('memoria-adata-xpg-spectrix-d35g-ddr4-16-gb-2x8-3600'),
        ('memoria-corsair-dominator-titanium-rgb-ddr5-32-gb-2x16-6600'),
        ('memoria-kingston-fury-beast-ddr4-16-gb-2x8-3200'),
        ('memoria-kingston-fury-beast-ddr5-32-gb-2x16-6000'),
        ('ssd-samsung-990-pro-nvme-m-2-2-tb'),
        ('ssd-sandisk-optimus-5100-nvme-1-tb'),
        ('tarjeta-de-video-amd-radeon-rx-9070-xt-16-gb'),
        ('tarjeta-de-video-nvidia-geforce-rtx-5060-8-gb'),
        ('tarjeta-de-video-nvidia-geforce-rtx-5060-ti-16-gb'),
        ('tarjeta-de-video-rtx-4060-8-gb'),
        ('fuente-750-w-80-gold'),
        ('fuente-gigabyte-ud850gm-850-w-80-gold'),
        ('fuente-msi-mag-a650bn-650-w-80-bronze'),
        ('kit-3-ventiladores-rgb-120-mm'),
        ('enfriamiento-liquido-240-mm'),
        ('escritorio-ergonomico-140-cm'),
        ('silla-ergonomica-con-soporte-lumbar')
      ) AS f(slug)
     WHERE p.slug = f.slug AND p.imagen IS NULL;
    INSERT INTO migracion_hecha (nombre) VALUES ('006-fotos-catalogo');
  END IF;
END $$;
