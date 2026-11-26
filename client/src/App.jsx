import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import TiendaLayout from './components/TiendaLayout.jsx';
import RutaProtegida from './components/RutaProtegida.jsx';
import Tienda from './pages/Tienda.jsx';
import Producto from './pages/Producto.jsx';
import Carrito from './pages/Carrito.jsx';
import Pagar from './pages/Pagar.jsx';
import Gracias from './pages/Gracias.jsx';
import Seguimiento from './pages/Seguimiento.jsx';
import Login from './pages/Login.jsx';
import NoEncontrado from './pages/NoEncontrado.jsx';
const Galeria3D = lazy(() => import('./pages/Galeria3D.jsx'));
const PanelLayout = lazy(() => import('./pages/panel/PanelLayout.jsx'));
const Resumen = lazy(() => import('./pages/panel/Resumen.jsx'));
const Productos = lazy(() => import('./pages/panel/Productos.jsx'));
const ProductoForm = lazy(() => import('./pages/panel/ProductoForm.jsx'));
const Pedidos = lazy(() => import('./pages/panel/Pedidos.jsx'));
const PedidoDetalle = lazy(() => import('./pages/panel/PedidoDetalle.jsx'));
const Reposicion = lazy(() => import('./pages/panel/Reposicion.jsx'));

export default function App() {
  return (
    <Routes>
      {/* Tienda pública */}
      <Route element={<TiendaLayout />}>
        <Route index element={<Tienda />} />
        <Route path="producto/:slug" element={<Producto />} />
        <Route path="carrito" element={<Carrito />} />
        <Route path="pagar" element={<Pagar />} />
        <Route path="pedido/:folio" element={<Gracias />} />
        <Route path="seguimiento" element={<Seguimiento />} />
        <Route path="login" element={<Login />} />
        <Route path="galeria-3d" element={<Suspense fallback={<p className="contenedor banda text-body-secondary">Cargando galería…</p>}><Galeria3D /></Suspense>} />
        <Route path="*" element={<NoEncontrado />} />
      </Route>

      {/* Panel con menú lateral por rol (se descarga solo cuando el personal entra) */}
      <Route path="panel" element={<RutaProtegida><Suspense fallback={<p className="p-4 text-body-secondary">Cargando panel…</p>}><PanelLayout /></Suspense></RutaProtegida>}>
        <Route index element={<Resumen />} />
        <Route path="productos" element={<Productos />} />
        <Route path="productos/nuevo" element={<RutaProtegida roles={['administrador']}><ProductoForm /></RutaProtegida>} />
        <Route path="productos/:id" element={<RutaProtegida roles={['administrador']}><ProductoForm /></RutaProtegida>} />
        <Route path="pedidos" element={<Pedidos />} />
        <Route path="pedidos/:id" element={<PedidoDetalle />} />
        <Route path="reposicion" element={<Reposicion />} />
      </Route>
    </Routes>
  );
}
