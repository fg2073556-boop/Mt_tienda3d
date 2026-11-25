import { Route, Routes } from 'react-router-dom';
import TiendaLayout from './components/TiendaLayout.jsx';
import RutaProtegida from './components/RutaProtegida.jsx';
import Tienda from './pages/Tienda.jsx';
import Producto from './pages/Producto.jsx';
import Carrito from './pages/Carrito.jsx';
import Pagar from './pages/Pagar.jsx';
import Gracias from './pages/Gracias.jsx';
import Login from './pages/Login.jsx';
import NoEncontrado from './pages/NoEncontrado.jsx';
import PanelLayout from './pages/panel/PanelLayout.jsx';
import Resumen from './pages/panel/Resumen.jsx';
import Productos from './pages/panel/Productos.jsx';
import ProductoForm from './pages/panel/ProductoForm.jsx';
import Pedidos from './pages/panel/Pedidos.jsx';
import PedidoDetalle from './pages/panel/PedidoDetalle.jsx';

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
        <Route path="login" element={<Login />} />
        <Route path="*" element={<NoEncontrado />} />
      </Route>

      {/* Panel con menú lateral por rol */}
      <Route path="panel" element={<RutaProtegida><PanelLayout /></RutaProtegida>}>
        <Route index element={<Resumen />} />
        <Route path="productos" element={<Productos />} />
        <Route path="productos/nuevo" element={<RutaProtegida roles={['administrador']}><ProductoForm /></RutaProtegida>} />
        <Route path="productos/:id" element={<RutaProtegida roles={['administrador']}><ProductoForm /></RutaProtegida>} />
        <Route path="pedidos" element={<Pedidos />} />
        <Route path="pedidos/:id" element={<PedidoDetalle />} />
      </Route>
    </Routes>
  );
}
