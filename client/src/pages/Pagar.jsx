import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../lib/api.js';
import { dinero, METODOS_PAGO } from '../lib/formato.js';

const VACIO = { cliente_nombre: '', cliente_correo: '', cliente_telefono: '', direccion: '', metodo_pago: 'tarjeta_prueba' };

export default function Pagar() {
  const { items, total, vaciar, cambiar } = useCart();
  const [datos, setDatos] = useState(VACIO);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();

  if (!items.length) {
    return <div className="contenedor banda"><p>Tu carrito está vacío.</p><Link to="/" className="btn btn-mt">Ir a la tienda</Link></div>;
  }

  const campo = (k) => ({ value: datos[k], onChange: (e) => { setDatos({ ...datos, [k]: e.target.value }); setError(''); } });

  const confirmar = async (e) => {
    e.preventDefault();
    if (datos.cliente_nombre.trim().length < 3) return setError('Escribe el nombre de quien recibe.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.cliente_correo)) return setError('Escribe un correo válido.');
    if (!datos.direccion.trim()) return setError('Escribe la dirección de entrega.');

    setEnviando(true);
    try {
      const pedido = await api('/pedidos', {
        method: 'POST',
        body: { ...datos, items: items.map((i) => ({ producto_id: i.id, cantidad: i.cantidad })) },
      });
      vaciar();
      navigate(`/pedido/${pedido.folio}`, { state: { pedido } });
    } catch (err) {
      // Si otro cliente compró antes, se ajusta el carrito a lo que queda
      if (err.detalles?.producto_id) cambiar(err.detalles.producto_id, err.detalles.existencias);
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="banda">
      <div className="contenedor">
        <h1 className="h2">Confirmar compra</h1>
        <div className="row g-3 mt-1">
          <div className="col-lg-7">
            <form className="card card-body gap-3" onSubmit={confirmar} noValidate>
              <h2 className="h5 mb-0">Datos de entrega</h2>
              <div className="row g-3">
                <div className="col-12"><label className="form-label">Nombre de quien recibe<input className="form-control" autoComplete="name" {...campo('cliente_nombre')} /></label></div>
                <div className="col-sm-6"><label className="form-label w-100">Correo<input type="email" className="form-control" autoComplete="email" {...campo('cliente_correo')} /></label></div>
                <div className="col-sm-6"><label className="form-label w-100">Teléfono<input type="tel" className="form-control" autoComplete="tel" {...campo('cliente_telefono')} /></label></div>
                <div className="col-12"><label className="form-label w-100">Dirección de entrega<textarea className="form-control" rows={2} autoComplete="street-address" {...campo('direccion')} /></label></div>
                <div className="col-12">
                  <label className="form-label w-100">Forma de pago
                    <select className="form-select" {...campo('metodo_pago')}>
                      {Object.entries(METODOS_PAGO).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                    </select>
                  </label>
                </div>
              </div>
              <p className="small text-body-secondary mb-0">Pago en modo de prueba: no se piden ni se guardan datos de tarjeta. Para cobrar de verdad se conecta una pasarela (Mercado Pago o Stripe) en modo sandbox.</p>
              {error && <div className="alert alert-danger mb-0">{error}</div>}
              <button className="btn btn-mt" disabled={enviando}>{enviando ? 'Procesando…' : `Confirmar compra por ${dinero(total)}`}</button>
            </form>
          </div>
          <div className="col-lg-5">
            <div className="card card-body">
              <h2 className="h5">Resumen</h2>
              <ul className="list-unstyled mb-2">
                {items.map((i) => (
                  <li key={i.id} className="d-flex justify-content-between gap-2 py-1 border-bottom">
                    <span>{i.cantidad} × {i.nombre}</span><span className="text-nowrap">{dinero(i.precio * i.cantidad)}</span>
                  </li>
                ))}
              </ul>
              <div className="d-flex justify-content-between total"><span>Total</span><span>{dinero(total)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
