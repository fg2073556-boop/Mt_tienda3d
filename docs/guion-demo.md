# Guion de la demo (3 minutos)

Una historia, una persona, en vivo. Practicarlo al menos 3 veces con cronómetro.

## Antes de presentar (10 minutos antes)

- [ ] Base limpia (hazlo PRIMERO, porque borra todo): `docker compose down -v`, `npm run bd`, `npm run crear-usuarios` y `npm run importar-catalogo`
- [ ] `npm run dev` corriendo
- [ ] Modelos `.glb` del equipo 3D subidos desde el panel (después de limpiar la base)
- [ ] Llave de Gemini en `server/.env` y una prueba rápida del asesor
- [ ] Dos pestañas abiertas: la tienda (`/`) y el panel ya con sesión (`/panel`)
- [ ] El PDF de una ficha técnica a la mano para la parte de IA
- [ ] Celular en la misma red Wi-Fi con la tienda abierta (opcional: realidad aumentada)
- [ ] Video de respaldo listo por si falla algo

## Guion

| Tiempo | Quién habla | Qué se hace | Qué se dice |
|---|---|---|---|
| 0:00–0:20 | Presentador | Pantalla de la tienda | "Ana estudia ingeniería civil en Tepeaca y necesita una computadora, pero no sabe qué comprar ni qué hay por dentro. M&T resuelve eso." |
| 0:20–0:50 | Presentador | Escribe en el asesor: *estudio ingeniería civil y uso AutoCAD* | "Ana le cuenta al asesor para qué la quiere. Gemini entiende su necesidad y le arma una solución completa solo con lo que hay en existencia." |
| 0:50–1:25 | Presentador | Toca la tarjeta de video, **Ver por dentro**, gira la escena | "Antes de pagar, Ana ve la PC por dentro. Cada pieza es un producto real, con su precio y existencias al momento." |
| 1:25–1:50 | Presentador | **Agregar todo**, carrito, pagar | "Compra en segundos. La compra es todo o nada: si alguien se llevó la última pieza, no se le cobra nada." |
| 1:50–2:20 | Segundo integrante | Pestaña del panel: alerta de stock, cambia el pedido a **Enviado** | "Del lado de la tienda, el vendedor ve la venta, una alerta porque la tarjeta de video se acaba de agotar, y actualiza el pedido." |
| 2:20–2:45 | Segundo integrante | Editar producto → **Analizar PDF** con la ficha técnica | "Y para capturar productos nuevos, Gemini lee la ficha técnica del fabricante y la explica en lenguaje que el cliente entiende." |
| 2:45–3:00 | Presentador | **Mi pedido** con el folio | "Ana consulta su pedido con su folio. Catálogo, carrito, stock y panel: los cuatro módulos, más 3D e IA." |

## Si algo falla

| Falla | Qué hacer |
|---|---|
| Gemini no responde | Seguir: el asesor responde con reglas. Decir "sin internet usa recomendaciones locales" |
| La escena 3D no carga | Mostrar el catálogo y la ficha del producto; continuar |
| No hay internet | La tienda funciona en local; solo la IA necesita internet |
| Se traba todo | Poner el video de respaldo |

## Preguntas que pueden hacer los jueces

| Pregunta | Respuesta corta |
|---|---|
| ¿Qué pasa si dos personas compran la última pieza a la vez? | La compra bloquea las filas con `FOR UPDATE`; la segunda recibe "solo quedan 0" y no se le cobra |
| ¿Cómo se avisa que se agotó algo? | Las existencias solo cambian en un servicio que crea la alerta automáticamente |
| ¿Cómo hicieron los modelos 3D? | Imagen de referencia con Gemini → Tripo/Meshy (imagen a 3D) → comprimidos a `.glb`; se suben desde el panel |
| ¿Es seguro el panel? | Contraseñas con bcrypt, sesiones JWT, permisos revisados en el servidor por rol |
| ¿Qué tanto se usa Gemini? | Tres usos: asesor (comprender), análisis de fichas PDF (analizar) y redacción de descripciones (crear) |
| ¿Cómo lo probaron? | 13 pruebas automáticas de la API (`npm test`) y la lista de `docs/pruebas.md` |
| ¿Se puede cobrar de verdad? | Sí, el flujo está listo para conectar Mercado Pago o Stripe en modo sandbox |
