import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Carrito guardado en el navegador (localStorage). El servidor vuelve a revisar
 * existencias al pagar, así que aquí solo evitamos pedir más de lo que se ve disponible.
 */
const CartContext = createContext(null);
const KEY = 'mt_carrito';

const leer = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};

export function CartProvider({ children }) {
  const [items, setItems] = useState(leer);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* sin almacenamiento */ }
  }, [items]);

  const value = useMemo(() => {
    /** Agrega unidades. Regresa un mensaje de error o null si todo salió bien. */
    const agregar = (producto, cantidad = 1) => {
      const actual = items.find((i) => i.id === producto.id)?.cantidad || 0;
      if (producto.existencias <= 0) return `${producto.nombre} está agotado.`;
      if (actual + cantidad > producto.existencias) return `Solo hay ${producto.existencias} de ${producto.nombre}.`;
      setItems((prev) => {
        const sin = prev.filter((i) => i.id !== producto.id);
        const { id, nombre, slug, precio, existencias } = producto;
        // Las licencias de software llegan por correo: no pagan envío
        const digital = producto.categoria?.slug === 'software';
        return [...sin, { id, nombre, slug, precio, existencias, digital, cantidad: actual + cantidad }];
      });
      return null;
    };
    const cambiar = (id, cantidad) =>
      setItems((prev) => (cantidad <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => (i.id === id ? { ...i, cantidad: Math.min(cantidad, i.existencias) } : i))));
    const quitar = (id) => setItems((prev) => prev.filter((i) => i.id !== id));
    const vaciar = () => setItems([]);

    return {
      items,
      agregar,
      cambiar,
      quitar,
      vaciar,
      cuenta: items.reduce((s, i) => s + i.cantidad, 0),
      total: items.reduce((s, i) => s + i.precio * i.cantidad, 0),
      conEnvio: items.some((i) => !i.digital),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
