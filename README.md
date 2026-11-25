# M&T · Tienda virtual 3D (reto COM-1)

Tienda en línea para vender soluciones integrales de PC (equipo, software y mobiliario) a estudiantes, ingenieros y empresarios de la región. El cliente puede ver el equipo en 3D, desarmarlo pieza por pieza y comprar cada parte.

## Módulos obligatorios del reto

| Módulo | Qué hace | Estado |
|---|---|---|
| Catálogo de productos | Alta, edición y baja con nombre, foto, precio y categoría | Prototipo listo |
| Carrito y pago | Agregar productos y completar la compra | Prototipo listo (pago simulado) |
| Gestión de stock | Existencias y aviso cuando un producto se agota | Prototipo listo |
| Panel del vendedor | Ver pedidos y cambiar su estado | Prototipo listo |
| Extra: vista 3D | Escena interactiva con la PC desarmable | Prototipo listo |
| Extra: asesor con Gemini | Recomienda equipo según el uso del cliente | Simulado, falta conectar la API |

## Cómo ver el prototipo

Abre `prototipo/index.html` con doble clic en cualquier navegador. No necesita instalar nada.

## Estructura de carpetas

```
prototipo/            Página de demostración (HTML + Three.js)
app/                  Aplicación final en Laravel (se crea aquí)
datos/catalogo.csv    Productos, precios y existencias de ejemplo
assets/
  modelos/originales  Modelos 3D tal como salen de Tripo, Meshy o Polycam
  modelos/web         Modelos .glb ya comprimidos, listos para la página
  imagenes/productos  Fotos de productos
  referencias/        Imágenes de referencia generadas con Gemini
diseno/
  marca/              Logo, colores y tipografías
  banners/            Banners e imágenes para redes
docs/
  prompts-3d.md       Prompts para generar las piezas 3D
  pruebas.md          Lista de pruebas antes de cada entrega
  presentacion/       Presentación y video de la demo
```

## Equipo y responsabilidades

| Rol | Responsable | Entregables |
|---|---|---|
| Líder técnico y desarrollo | Fernando González Méndez | Código de la app, revisión de cambios |
| Responsable 3D | Por asignar | Modelos `.glb` de cada pieza en `assets/modelos/web` |
| Responsable de catálogo | Por asignar | `datos/catalogo.csv` completo, fotos y descripciones |
| Diseño y marca | Por asignar | Logo, banners, presentación |
| Pruebas y documentación | Por asignar | `docs/pruebas.md`, manual de usuario, reporte de errores |

## Cómo colaborar

Lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de subir tu primer cambio.

## Tecnologías

- Prototipo: HTML, CSS, JavaScript y Three.js
- App final: Laravel + MySQL
- 3D: Tripo / Meshy, Polycam, Blender, `<model-viewer>`
- IA: API de Google Gemini
