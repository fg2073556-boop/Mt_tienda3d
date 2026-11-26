export const PIEZAS = {
  gab: 'Gabinete / equipo completo',
  cpu: 'Procesador',
  cooler: 'Enfriamiento',
  ram: 'Memoria RAM',
  gpu: 'Tarjeta de video',
  ssd: 'Almacenamiento SSD',
  psu: 'Fuente de poder',
  fans: 'Ventiladores',
  monitor: 'Monitor',
  kb: 'Teclado y mouse',
  desk: 'Escritorio',
  silla: 'Silla',
};

export const ESTADOS = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  preparacion: 'En preparación',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

/** Estados que el vendedor todavía tiene que atender */
export const ESTADOS_ABIERTOS = ['pendiente', 'pagado', 'preparacion'];

export const METODOS_PAGO = {
  tarjeta_prueba: 'Tarjeta (modo de prueba)',
  transferencia: 'Transferencia',
  tienda: 'Pago en tienda',
};
