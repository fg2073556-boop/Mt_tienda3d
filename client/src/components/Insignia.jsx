/** Etiqueta de existencias: Agotado / Quedan N / N en existencia */
export default function Insignia({ producto }) {
  if (producto.existencias <= 0) return <span className="insignia agotado">Agotado</span>;
  if (producto.existencias <= producto.stock_minimo) return <span className="insignia bajo">Quedan {producto.existencias}</span>;
  return <span className="insignia ok">{producto.existencias} en existencia</span>;
}
