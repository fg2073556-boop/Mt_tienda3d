import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAviso } from '../components/Aviso.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

/**
 * Agregar al carrito pidiendo cuenta: sin sesión, manda a crear cuenta (o entrar)
 * y, al terminar, regresa a la misma página con el producto ya en el carrito.
 * @returns {(productos: object|object[], cantidad?: number) => void}
 */
export function useAgregar() {
  const { usuario } = useAuth();
  const { agregar } = useCart();
  const avisar = useAviso();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  return useCallback((productos, cantidad = 1) => {
    const lista = Array.isArray(productos) ? productos : [productos];
    if (!usuario) {
      navigate('/ingresar', { state: { desde: pathname + search, scrollY: window.scrollY, pendiente: lista.map((producto) => ({ producto, cantidad })) } });
      return;
    }
    const fallas = lista.map((p) => agregar(p, cantidad)).filter(Boolean);
    if (fallas.length) avisar(fallas.join(' '), 'error');
    else avisar(lista.length === 1 ? `Agregado: ${lista[0].nombre}` : `Se agregaron ${lista.length} productos al carrito.`);
  }, [usuario, agregar, avisar, navigate, pathname, search]);
}
