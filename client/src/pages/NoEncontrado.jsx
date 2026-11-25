import { Link } from 'react-router-dom';

export default function NoEncontrado() {
  return (
    <section className="banda">
      <div className="contenedor">
        <h1 className="h2">Esta página no existe</h1>
        <Link to="/" className="btn btn-mt mt-3">Ir a la tienda</Link>
      </div>
    </section>
  );
}
