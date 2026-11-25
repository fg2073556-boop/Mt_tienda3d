# Lista de pruebas manuales

Correr completa antes de cada entrega y después de cada cambio grande. Marca `[x]` cuando pase. Si algo falla, crea un *issue* en GitHub con los pasos para repetirlo y una captura.

Las pruebas automáticas de la API se corren con `npm test` (ver README).

## Tienda (cliente)

- [ ] La escena 3D carga, gira con el mouse y con el dedo en el celular
- [ ] **Ver por dentro** separa las piezas y muestra sus nombres; **Armar de nuevo** las regresa
- [ ] Tocar una pieza muestra nombre, precio y existencias en la ficha
- [ ] Los colores de luz cambian, incluido el arcoíris
- [ ] El filtro por categoría y el buscador funcionan
- [ ] **Ver en 3D** desde el catálogo lleva a la pieza correcta
- [ ] La ficha del producto abre; si tiene modelo `.glb`, se puede girar
- [ ] El asesor responde y **Agregar todo al carrito** funciona
- [ ] El asesor sin llave de Gemini sigue respondiendo (con reglas)

## Carrito y pago

- [ ] Agregar, cambiar cantidad y quitar productos
- [ ] No deja agregar más unidades de las que hay en existencia
- [ ] Un producto agotado no se puede agregar
- [ ] El pago pide nombre, correo válido y dirección
- [ ] Al confirmar aparece el folio y el carrito queda vacío
- [ ] Si otra persona compró la última pieza mientras tanto, aparece el aviso y no se crea el pedido
- [ ] **Mi pedido** muestra el pedido con folio y correo correctos
- [ ] **Mi pedido** NO muestra nada con un correo distinto

## Stock

- [ ] Al comprar bajan las existencias
- [ ] Al llegar a 0 aparece la alerta **Agotado** en el resumen del panel
- [ ] Al bajar del mínimo aparece la alerta **Bajo**
- [ ] Al cancelar un pedido las piezas regresan al inventario

## Panel (administrador)

- [ ] Entrar con la cuenta de administrador; contraseña incorrecta muestra error
- [ ] Dar de alta un producto con foto
- [ ] Editar precio, existencias y descripción
- [ ] Subir un `.glb` a una pieza y verlo en la escena de la tienda
- [ ] Eliminar un producto (pide confirmar) y que desaparezca de la tienda
- [ ] **Redactar con IA** llena la descripción (con llave de Gemini)
- [ ] **Analizar PDF** muestra resumen y especificaciones (con llave de Gemini)
- [ ] Cambiar el estado de un pedido desde la lista y desde el detalle
- [ ] Cerrar sesión

## Panel (vendedor)

- [ ] Entra y ve Resumen, Productos y Pedidos, pero NO **Dar de alta**
- [ ] Puede usar **−** y **+** de existencias
- [ ] No ve botones de Editar ni Eliminar
- [ ] Si escribe `/panel/productos/nuevo` en la barra, ve el aviso de que su rol no tiene acceso

## Dispositivos

- [ ] Computadora con Chrome
- [ ] Computadora con Edge o Firefox
- [ ] Celular Android
- [ ] iPhone
