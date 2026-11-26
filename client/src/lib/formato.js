export const dinero = (v) => '$' + Math.round(Number(v) || 0).toLocaleString('es-MX');

export const fecha = (v) =>
  new Date(v).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const ESTADOS = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  preparacion: 'En preparación',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export const METODOS_PAGO = {
  tarjeta_prueba: 'Tarjeta (modo de prueba)',
  tarjeta: 'Tarjeta de crédito o débito',
  transferencia: 'Transferencia SPEI',
  tienda: 'Efectivo en tienda',
};
