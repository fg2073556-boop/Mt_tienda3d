/**
 * Lista ligera de modelos (sin three.js) para el selector del panel.
 * Si agregas un modelo en los archivos de piezas, agrégalo aquí también.
 */
export const GRUPOS_MODELOS = [
  ['Procesadores', [
    ['cpu-core-ultra-9-285k', 'Intel Core Ultra 9 285K'], ['cpu-core-ultra-7-265k', 'Intel Core Ultra 7 265K'],
    ['cpu-ryzen-9-9950x3d', 'AMD Ryzen 9 9950X3D'], ['cpu-ryzen-5-5600g', 'AMD Ryzen 5 5600G'], ['cpu-ryzen-7-7700', 'AMD Ryzen 7 7700'],
  ]],
  ['Tarjetas madre', [
    ['mb-rog-maximus-z890-extreme', 'ASUS ROG Maximus Z890 Extreme'], ['mb-msi-b550m-pro-vdh-wifi', 'MSI B550M PRO-VDH WiFi'], ['mb-atx-b650', 'ATX B650 genérica'],
  ]],
  ['Memoria RAM', [
    ['ram-fury-beast-ddr4', 'Kingston FURY Beast DDR4'], ['ram-xpg-spectrix-d35g', 'ADATA XPG Spectrix D35G'],
    ['ram-fury-beast-ddr5', 'Kingston FURY Beast DDR5'], ['ram-dominator-titanium', 'Corsair Dominator Titanium RGB'], ['ram-ddr5-rgb', 'DDR5 RGB genérica'],
  ]],
  ['Almacenamiento', [
    ['ssd-sandisk-optimus-5100', 'SanDisk Optimus 5100'], ['ssd-samsung-990-pro', 'Samsung 990 PRO'], ['ssd-nvme-generico', 'SSD NVMe genérico'],
  ]],
  ['Tarjetas de video', [
    ['gpu-rtx-5060', 'GeForce RTX 5060'], ['gpu-rtx-5060-ti', 'GeForce RTX 5060 Ti'], ['gpu-rx-9070-xt', 'Radeon RX 9070 XT'], ['gpu-rtx-4060', 'GeForce RTX 4060'],
  ]],
  ['Fuentes de poder', [
    ['psu-msi-mag-a650bn', 'MSI MAG A650BN 650 W'], ['psu-gigabyte-ud850gm', 'Gigabyte UD850GM 850 W'], ['psu-750-gold', '750 W Gold genérica'],
  ]],
  ['Enfriamiento', [
    ['ventiladores-kit-rgb', 'Kit 3 ventiladores RGB'], ['ventilador-120-rgb', 'Ventilador RGB 120 mm'], ['aio-240', 'Enfriamiento líquido 240 mm'], ['aio-360', 'Enfriamiento líquido 360 mm'],
  ]],
  ['Equipos y periféricos', [
    ['pc-gamer-fenix', 'PC Gamer (gabinete con vidrio)'], ['pc-oficina', 'PC de oficina'], ['monitor-27', 'Monitor 27"'], ['teclado-mouse', 'Teclado + mouse'],
  ]],
  ['Mobiliario', [['escritorio-140', 'Escritorio 140 cm'], ['silla-ergonomica', 'Silla ergonómica']]],
  ['Software', [
    ['sw-sistema-operativo', 'Caja de sistema operativo'], ['sw-oficina', 'Caja de suite de oficina'], ['sw-cad', 'Caja de software CAD'], ['sw-antivirus', 'Caja de antivirus'],
  ]],
];

export const CODIGOS_MODELO = new Set(GRUPOS_MODELOS.flatMap(([, l]) => l.map(([c]) => c)));
export const nombreModelo = (codigo) => GRUPOS_MODELOS.flatMap(([, l]) => l).find(([c]) => c === codigo)?.[1] || '';
