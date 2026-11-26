import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import TiendaLayout from './components/TiendaLayout.jsx';
import RutaProtegida from './components/RutaProtegida.jsx';
import Tienda from './pages/Tienda.jsx';
import Producto from './pages/Producto.jsx';
import Carrito from './pages/Carrito.jsx';
import Pagar from './pages/Pagar.jsx';
import Gracias from './pages/Gracias.jsx';
import Seguimiento from './pages/Seguimiento.jsx';
import Ingresar from './pages/Ingresar.jsx';
import NoEncontrado from './pages/NoEncontrado.jsx';
const Galeria3D = lazy(() => import('./pages/Galeria3D.jsx'));
const Envios = lazy(() => import('./pages/Envios.jsx'));
const MisPedidos = lazy(() => import('./pages/MisPedidos.jsx'));
const PanelLayout = lazy(() => import('./pages/panel/PanelLayout.jsx'));
const Resumen = lazy(() => import('./pages/panel/Resumen.jsx'));
const Productos = lazy(() => import('./pages/panel/Productos.jsx'));
const ProductoForm = lazy(() => import('./pages/panel/ProductoForm.jsx'));
const Pedidos = lazy(() => import('./pages/panel/Pedidos.jsx'));
const PedidoDetalle = lazy(() => import('./pages/panel/PedidoDetalle.jsx'));
const Reposicion = lazy(() => import('./pages/panel/Reposicion.jsx'));
const PanelEnvios = lazy(() => import('./pages/panel/Envios.jsx'));

export default function App() {
  return (
    <Routes>
      {/* Tienda pública */}
      <Route element={<TiendaLayout />}>
        <Route index element={<Tienda />} />
        <Route path="producto/:slug" element={<Producto />} />
        <Route path="carrito" element={<Carrito />} />
        <Route path="pagar" element={<RutaProtegida><Pagar /></RutaProtegida>} />
        <Route path="pedido/:folio" element={<Gracias />} />
        <Route path="seguimiento" element={<Seguimiento />} />
        <Route path="envios" element={<Suspense fallback={<p className="contenedor banda text-body-secondary">Cargando…</p>}><Envios /></Suspense>} />
        <Route path="ingresar" element={<Ingresar key="entrar" />} />
        <Route path="registro" element={<Ingresar key="registro" modo="registro" />} />
        <Route path="login" element={<Navigate to="/ingresar" replace />} />
        <Route path="mis-pedidos" element={<RutaProtegida><Suspense fallback={<p className="contenedor banda text-body-secondary">Cargando…</p>}><MisPedidos /></Suspense></RutaProtegida>} />
        <Route path="galeria-3d" element={<Suspense fallback={<p className="contenedor banda text-body-secondary">Cargando galería…</p>}><Galeria3D /></Suspense>} />
        <Route path="*" element={<NoEncontrado />} />
      </Route>

      {/* Panel con menú lateral por rol (se descarga solo cuando el personal entra) */}
      <Route path="panel" element={<RutaProtegida roles={['administrador', 'vendedor']}><Suspense fallback={<p className="p-4 text-body-secondary">Cargando panel…</p>}><PanelLayout /></Suspense></RutaProtegida>}>
        <Route index element={<Resumen />} />
        <Route path="productos" element={<Productos />} />
        <Route path="productos/nuevo" element={<RutaProtegida roles={['administrador']}><ProductoForm /></RutaProtegida>} />
        <Route path="productos/:id" element={<RutaProtegida roles={['administrador']}><ProductoForm /></RutaProtegida>} />
        <Route path="pedidos" element={<Pedidos />} />
        <Route path="pedidos/:id" element={<PedidoDetalle />} />
        <Route path="reposicion" element={<Reposicion />} />
        <Route path="envios" element={<RutaProtegida roles={['administrador']}><PanelEnvios /></RutaProtegida>} />
      </Route>
    </Routes>
  );
}
