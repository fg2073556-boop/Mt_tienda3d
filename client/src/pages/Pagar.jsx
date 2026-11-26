import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../lib/api.js';
import { dinero } from '../lib/formato.js';
import { formatearNumero, marcaDe, prepararOpenpay, soloDigitos, tokenizar } from '../lib/openpay.js';

const VACIO = { cliente_nombre: '', cliente_correo: '', cliente_telefono: '', direccion: '' };
const TARJETA_VACIA = { titular: '', numero: '', vence: '', cvv: '' };

const Trazo = ({ children }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
const ICONOS = {
  tarjeta: <Trazo><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19M6.5 15h4" /></Trazo>,
  transferencia: <Trazo><path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" /></Trazo>,
  tienda: <Trazo><path d="M4 9.5 5.5 4h13L20 9.5M4 9.5h16v10.5H4zM4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M10 20v-5h4v5" /></Trazo>,
  candado: <Trazo><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Trazo>,
};

function opciones(openpay) {
  return [
    { id: openpay ? 'tarjeta' : 'tarjeta_prueba', icono: 'tarjeta', titulo: 'Tarjeta de crédito o débito', texto: openpay ? 'Visa, Mastercard o American Express. Se cobra al momento.' : 'Modo de prueba: no se piden datos de tarjeta.' },
    { id: 'transferencia', icono: 'transferencia', titulo: 'Transferencia SPEI', texto: 'Te damos una CLABE para pagar desde la app de cualquier banco.' },
    { id: 'tienda', icono: 'tienda', titulo: 'Efectivo en tienda', texto: 'Pagas con una referencia en tiendas afiliadas a Paynet.' },
  ];
}

export default function Pagar() {
  const { items, total, vaciar, cambiar } = useCart();
  const [datos, setDatos] = useState(VACIO);
  const [config, setConfig] = useState(null); // { activo, merchantId, publicKey, sandbox }
  const [metodo, setMetodo] = useState('');
  const [tarjeta, setTarjeta] = useState(TARJETA_VACIA);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api('/pagos/config')
      .then((c) => {
        setConfig(c);
        setMetodo(c.activo ? 'tarjeta' : 'tarjeta_prueba');
        // Se carga Openpay.js desde antes para tener listo el identificador antifraude
        if (c.activo) prepararOpenpay(c).catch(() => {});
      })
      .catch(() => { setConfig({ activo: false }); setMetodo('tarjeta_prueba'); });
  }, []);

  if (!items.length) {
    return <div className="contenedor banda"><p>Tu carrito está vacío.</p><Link to="/" className="btn btn-mt">Ir a la tienda</Link></div>;
  }

  const campo = (k) => ({ value: datos[k], onChange: (e) => { setDatos({ ...datos, [k]: e.target.value }); setError(''); } });
  const campoTarjeta = (k, formato = (v) => v) => ({
    value: tarjeta[k],
    onChange: (e) => { setTarjeta({ ...tarjeta, [k]: formato(e.target.value) }); setError(''); },
  });
  const formatoVence = (v) => {
    const d = soloDigitos(v).slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };
  const marca = marcaDe(tarjeta.numero);
  const conTarjeta = metodo === 'tarjeta' && config?.activo;

  const confirmar = async (e) => {
    e.preventDefault();
    if (datos.cliente_nombre.trim().length < 3) return setError('Escribe el nombre de quien recibe.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.cliente_correo)) return setError('Escribe un correo válido.');
    if (!datos.direccion.trim()) return setError('Escribe la dirección de entrega.');

    try {
      let extra = {};
      if (conTarjeta) {
        setEnviando('Protegiendo tu tarjeta…');
        const { token, deviceSessionId } = await tokenizar(config, tarjeta);
        extra = { token_id: token, device_session_id: deviceSessionId };
      }
      setEnviando(conTarjeta ? 'Cobrando…' : 'Generando tu referencia…');
      const pedido = await api('/pedidos', {
        method: 'POST',
        body: { ...datos, metodo_pago: metodo, ...extra, items: items.map((i) => ({ producto_id: i.id, cantidad: i.cantidad })) },
      });
      setTarjeta(TARJETA_VACIA);
      vaciar();
      navigate(`/pedido/${pedido.folio}`, { state: { pedido } });
    } catch (err) {
      // Si otro cliente compró antes, se ajusta el carrito a lo que queda
      if (err.detalles?.producto_id) cambiar(err.detalles.producto_id, err.detalles.existencias);
      setError(err.message);
    } finally {
      setEnviando('');
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
                <div className="col-12"><label className="form-label w-100">Nombre de quien recibe<input className="form-control" autoComplete="name" {...campo('cliente_nombre')} /></label></div>
                <div className="col-sm-6"><label className="form-label w-100">Correo<input type="email" className="form-control" autoComplete="email" {...campo('cliente_correo')} /></label></div>
                <div className="col-sm-6"><label className="form-label w-100">Teléfono<input type="tel" className="form-control" autoComplete="tel" {...campo('cliente_telefono')} /></label></div>
                <div className="col-12"><label className="form-label w-100">Dirección de entrega<textarea className="form-control" rows={2} autoComplete="street-address" {...campo('direccion')} /></label></div>
              </div>

              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-2">
                <h2 className="h5 mb-0">Forma de pago</h2>
                {config?.activo && <span className="pago-proveedor">{ICONOS.candado} Pagos seguros con Openpay{config.sandbox && <em>· modo de pruebas</em>}</span>}
              </div>
              {!config ? <p className="text-body-secondary mb-0">Cargando formas de pago…</p> : (
                <div className="pago-opciones" role="radiogroup" aria-label="Forma de pago">
                  {opciones(config.activo).map((o) => (
                    <label key={o.id} className={`pago-opcion ${metodo === o.id ? 'activa' : ''}`}>
                      <input type="radio" name="metodo_pago" value={o.id} checked={metodo === o.id} onChange={() => { setMetodo(o.id); setError(''); }} />
                      <span className="pago-opcion-icono">{ICONOS[o.icono]}</span>
                      <span><b>{o.titulo}</b><small>{o.texto}</small></span>
                    </label>
                  ))}
                </div>
              )}

              {conTarjeta && (
                <fieldset className="pago-tarjeta" disabled={Boolean(enviando)}>
                  <legend className="visually-hidden">Datos de la tarjeta</legend>
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label w-100">Nombre como aparece en la tarjeta
                        <input className="form-control" autoComplete="cc-name" {...campoTarjeta('titular')} />
                      </label>
                    </div>
                    <div className="col-12">
                      <label className="form-label w-100">Número de tarjeta
                        <div className="pago-numero">
                          <input className="form-control" inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" {...campoTarjeta('numero', formatearNumero)} />
                          {marca && <span className={`pago-marca ${marca}`}>{marca === 'amex' ? 'AMEX' : marca === 'visa' ? 'VISA' : 'Mastercard'}</span>}
                        </div>
                      </label>
                    </div>
                    <div className="col-6">
                      <label className="form-label w-100">Vence
                        <input className="form-control" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" {...campoTarjeta('vence', formatoVence)} />
                      </label>
                    </div>
                    <div className="col-6">
                      <label className="form-label w-100">Código de seguridad
                        <input className="form-control" inputMode="numeric" autoComplete="cc-csc" placeholder={marca === 'amex' ? '4 dígitos' : '3 dígitos'} maxLength={4} {...campoTarjeta('cvv', (v) => soloDigitos(v).slice(0, 4))} />
                      </label>
                    </div>
                  </div>
                  <p className="pago-seguro">{ICONOS.candado} Los datos de tu tarjeta van cifrados directo a Openpay. M&amp;T no los ve ni los guarda.</p>
                  {config.sandbox && (
                    <p className="small text-body-secondary mb-0">
                      Modo de pruebas: no se cobra dinero real. Usa las <a href="https://documents.openpay.mx/en/docs/testing.html" target="_blank" rel="noreferrer">tarjetas de prueba de Openpay</a>.
                    </p>
                  )}
                </fieldset>
              )}

              {!config?.activo && config && (
                <p className="small text-body-secondary mb-0">Pago simulado: la tienda todavía no tiene llaves de Openpay, así que no se cobra nada.</p>
              )}
              {error && <div className="alert alert-danger mb-0" role="alert">{error}</div>}
              <button className="btn btn-mt btn-lg" disabled={Boolean(enviando) || !config}>
                {enviando ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />{enviando}</>
                  : conTarjeta ? `Pagar ${dinero(total)}` : metodo === 'tarjeta_prueba' ? `Confirmar compra por ${dinero(total)}` : `Generar referencia de pago por ${dinero(total)}`}
              </button>
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
