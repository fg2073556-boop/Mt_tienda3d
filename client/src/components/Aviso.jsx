import { createContext, useCallback, useContext, useState } from 'react';

/** Avisos flotantes ("Agregado al carrito", errores, etc.) */
const AvisoContext = createContext(() => {});

export function AvisoProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const avisar = useCallback((texto, tipo = 'ok') => {
    const id = Math.random();
    setAvisos((a) => [...a, { id, texto, tipo }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 3600);
  }, []);
  return (
    <AvisoContext.Provider value={avisar}>
      {children}
      <div className="avisos" aria-live="polite">
        {avisos.map((a) => <div key={a.id} className={`aviso ${a.tipo}`}>{a.texto}</div>)}
      </div>
    </AvisoContext.Provider>
  );
}

export const useAviso = () => useContext(AvisoContext);
