# Tareas del equipo

Cada tarea se puede copiar como *issue* en GitHub (pestaña **Issues → New issue**) y asignarse a una persona. "Listo cuando" es lo que revisa el líder antes de aceptar el *pull request*.

## Todos (primer día)

| Tarea | Listo cuando |
|---|---|
| Instalar Git, Node.js 20+ y Docker Desktop | `git --version`, `node -v` y `docker -v` responden |
| Clonar el repositorio y levantar el proyecto con `npm run instalar`, `npm run preparar`, `npm run bd`, `npm run crear-usuarios` y `npm run dev` | Ve la tienda en http://localhost:5173 |
| Primer *pull request*: poner su nombre en la tabla de equipo del README | El PR está aceptado en `main` |

## Responsable 3D

| Tarea | Listo cuando |
|---|---|
| Generar la imagen de referencia de cada pieza con Gemini (prompt de `docs/prompts-3d.md`) | 13 imágenes en `assets/referencias/` |
| Convertir cada imagen a 3D con Tripo o Meshy | 13 archivos en `assets/modelos/originales/` |
| Comprimir cada modelo en gltf.report | 13 `.glb` de menos de 5 MB en `assets/modelos/web/` |
| Subir cada `.glb` desde el panel a su producto y revisar cómo se ve en la escena | Captura de la escena con todos los modelos |
| Marcar el avance en la tabla de `docs/prompts-3d.md` | Tabla completa |

## Responsable de catálogo

| Tarea | Listo cuando |
|---|---|
| Investigar precios reales de la región para los 17 productos | Precios actualizados en `datos/catalogo.csv` |
| Agregar al menos 15 productos nuevos (periféricos, mobiliario, software) | 30+ renglones en el CSV |
| Conseguir una foto de cada producto (cuadrada, 800×800 px) | Fotos en `assets/imagenes/productos/` con su nombre en la columna `imagen` |
| Revisar que el CSV importe sin errores con `npm run importar-catalogo -- --prueba` | El comando no marca errores |

## Diseño y marca

| Tarea | Listo cuando |
|---|---|
| Logo de M&T en SVG y PNG | Archivos en `diseno/marca/` |
| Presentación para el pitch (5 diapositivas: problema, solución, demo, tecnología, equipo) | Archivo en `docs/presentacion/` |
| Banner para redes y para la pantalla del evento | Archivos en `diseno/banners/` |
| Grabar el video de respaldo siguiendo `docs/guion-demo.md` | Video de 3 minutos en `docs/presentacion/` |

## Pruebas y documentación

| Tarea | Listo cuando |
|---|---|
| Correr `docs/pruebas.md` completo en computadora | Todas las casillas marcadas o con su *issue* |
| Correr las pruebas en un celular Android y un iPhone | Sección de dispositivos marcada |
| Reportar cada error como *issue* con pasos y captura | Issues creados |
| Revisar que el manual (`docs/manual-usuario.md`) coincida con la app; tomar capturas nuevas si algo cambió | Manual actualizado |
| Ensayar la demo con cronómetro junto con el presentador | Dos ensayos de menos de 3:10 |

## Líder técnico

| Tarea | Listo cuando |
|---|---|
| Poner la llave de Gemini y probar las tres funciones de IA | Asesor, Redactar con IA y Analizar PDF funcionan |
| Revisar y aceptar los *pull requests* del equipo | Sin PR pendientes de más de un día |
| Corregir los *issues* que reporte pruebas | Issues cerrados |
| Congelar el código 24 horas antes del evento | Sin cambios en `main` el último día |
