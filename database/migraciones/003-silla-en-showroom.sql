-- La silla aparece en el showroom de la página principal y se puede tocar como las demás piezas.
UPDATE producto SET pieza_3d = 'silla' WHERE slug = 'silla-ergonomica-con-soporte-lumbar' AND pieza_3d IS NULL;
