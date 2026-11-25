-- =========================================================
-- Datos de ejemplo (mismos que datos/catalogo.csv)
-- La cuenta del vendedor se crea con: cd server && npm run crear-usuarios
-- =========================================================

INSERT INTO categoria (nombre, slug) VALUES
    ('Equipo', 'equipo'),
    ('Componentes', 'componentes'),
    ('Software', 'software'),
    ('Mobiliario', 'mobiliario');

INSERT INTO producto (categoria_id, nombre, slug, precio, existencias, pieza_3d, descripcion) VALUES
    ((SELECT id FROM categoria WHERE slug = 'equipo'),      'PC Gamer M&T Fénix', 'pc-gamer-mt-fenix', 28999, 4, 'gab', 'Ryzen 7, RTX 4060, 32 GB DDR5, 1 TB NVMe y enfriamiento líquido. Para jugar, modelar y programar.'),
    ((SELECT id FROM categoria WHERE slug = 'equipo'),      'PC Oficina M&T Básica', 'pc-oficina-mt-basica', 11499, 6, NULL, 'Ryzen 5 con gráficos integrados, 16 GB y 512 GB. Ideal para ofimática y clases en línea.'),
    ((SELECT id FROM categoria WHERE slug = 'componentes'), 'Procesador Ryzen 7 7700', 'procesador-ryzen-7-7700', 5899, 7, 'cpu', '8 núcleos y 16 hilos, hasta 5.3 GHz.'),
    ((SELECT id FROM categoria WHERE slug = 'componentes'), 'Tarjeta de video RTX 4060 8 GB', 'tarjeta-de-video-rtx-4060-8-gb', 6999, 2, 'gpu', 'Ray tracing y DLSS para juegos y render a 1080p y 1440p.'),
    ((SELECT id FROM categoria WHERE slug = 'componentes'), 'Memoria 32 GB DDR5 RGB (2x16)', 'memoria-32-gb-ddr5-rgb-2x16', 2199, 12, 'ram', '6000 MHz con iluminación sincronizable.'),
    ((SELECT id FROM categoria WHERE slug = 'componentes'), 'SSD NVMe 1 TB', 'ssd-nvme-1-tb', 1299, 0, 'ssd', 'Hasta 5,000 MB/s de lectura; arranque en segundos.'),
    ((SELECT id FROM categoria WHERE slug = 'componentes'), 'Fuente 750 W 80+ Gold', 'fuente-750-w-80-gold', 1799, 5, 'psu', 'Modular, con protección contra picos de voltaje.'),
    ((SELECT id FROM categoria WHERE slug = 'componentes'), 'Kit 3 ventiladores RGB 120 mm', 'kit-3-ventiladores-rgb-120-mm', 799, 9, 'fans', 'Flujo de aire silencioso con control de color.'),
    ((SELECT id FROM categoria WHERE slug = 'componentes'), 'Enfriamiento líquido 240 mm', 'enfriamiento-liquido-240-mm', 1899, 3, 'cooler', 'Mantiene el procesador fresco en sesiones largas.'),
    ((SELECT id FROM categoria WHERE slug = 'equipo'),      'Monitor 27" QHD 165 Hz', 'monitor-27-qhd-165-hz', 4599, 6, 'monitor', 'Panel IPS con colores fieles para diseño y juego.'),
    ((SELECT id FROM categoria WHERE slug = 'equipo'),      'Teclado mecánico + mouse', 'teclado-mecanico-mouse', 1199, 8, 'kb', 'Switches rojos, retroiluminación y mouse de 12,000 DPI.'),
    ((SELECT id FROM categoria WHERE slug = 'mobiliario'),  'Escritorio ergonómico 140 cm', 'escritorio-ergonomico-140-cm', 3499, 4, 'desk', 'Cubierta amplia, estructura metálica y pasacables.'),
    ((SELECT id FROM categoria WHERE slug = 'mobiliario'),  'Silla ergonómica con soporte lumbar', 'silla-ergonomica-con-soporte-lumbar', 3899, 1, NULL, 'Malla transpirable, brazos ajustables y reclinación.'),
    ((SELECT id FROM categoria WHERE slug = 'software'),    'Windows 11 Pro (licencia digital)', 'windows-11-pro-licencia-digital', 2999, 50, NULL, 'Instalado y activado al entregar tu equipo.'),
    ((SELECT id FROM categoria WHERE slug = 'software'),    'Suite de oficina (1 año)', 'suite-de-oficina-1-ano', 1299, 40, NULL, 'Procesador de textos, hojas de cálculo y presentaciones.'),
    ((SELECT id FROM categoria WHERE slug = 'software'),    'Software CAD educativo (1 año)', 'software-cad-educativo-1-ano', 1599, 20, NULL, 'Dibujo técnico 2D y 3D para ingeniería y arquitectura.'),
    ((SELECT id FROM categoria WHERE slug = 'software'),    'Antivirus para 3 equipos (1 año)', 'antivirus-para-3-equipos-1-ano', 599, 30, NULL, 'Protección en tiempo real y control parental.');

-- Pedidos de ejemplo para que el panel no se vea vacío en la demo
INSERT INTO pedido (folio, cliente_nombre, cliente_correo, cliente_telefono, direccion, metodo_pago, estado, total, creado_en) VALUES
    ('MT-00001', 'Papelería La Estrella', 'estrella@ejemplo.com', '2220000000', 'Tepeaca, Puebla', 'transferencia', 'entregado', 13397, NOW() - INTERVAL '3 days'),
    ('MT-00002', 'Diego Torres', 'diego@ejemplo.com', '2220000000', 'Tepeaca, Puebla', 'transferencia', 'enviado', 2199, NOW() - INTERVAL '1 day'),
    ('MT-00003', 'Constructora Ramírez', 'compras@ejemplo.com', '2220000000', 'Tepeaca, Puebla', 'transferencia', 'preparacion', 21196, NOW()),
    ('MT-00004', 'Laura Méndez', 'laura@ejemplo.com', '2220000000', 'Tepeaca, Puebla', 'tienda', 'pendiente', 30198, NOW());

INSERT INTO pedido_detalle (pedido_id, producto_id, producto_nombre, precio_unitario, cantidad, subtotal)
SELECT p.id, pr.id, pr.nombre, pr.precio, 1, pr.precio
FROM (VALUES
    ('MT-00001', 'pc-oficina-mt-basica'), ('MT-00001', 'suite-de-oficina-1-ano'), ('MT-00001', 'antivirus-para-3-equipos-1-ano'),
    ('MT-00002', 'memoria-32-gb-ddr5-rgb-2x16'),
    ('MT-00003', 'pc-oficina-mt-basica'), ('MT-00003', 'monitor-27-qhd-165-hz'), ('MT-00003', 'software-cad-educativo-1-ano'), ('MT-00003', 'escritorio-ergonomico-140-cm'),
    ('MT-00004', 'pc-gamer-mt-fenix'), ('MT-00004', 'teclado-mecanico-mouse')
) AS v(folio, slug)
JOIN pedido p ON p.folio = v.folio
JOIN producto pr ON pr.slug = v.slug;

-- Los siguientes pedidos continúan después de los de ejemplo
SELECT setval('pedido_id_seq', (SELECT MAX(id) FROM pedido));
