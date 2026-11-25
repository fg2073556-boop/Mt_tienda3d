# Guía para colaborar (paso a paso)

Esta guía es para quienes nunca han usado Git. Síguela en orden.

## 1. Preparar tu computadora (solo una vez)

1. Crea una cuenta en https://github.com y pásale tu nombre de usuario a Fernando para que te dé acceso.
2. Acepta la invitación que te llega por correo.
3. Instala Git (https://git-scm.com/downloads), Node.js 20 o más nuevo (https://nodejs.org) y Docker Desktop (https://www.docker.com/products/docker-desktop).
4. Abre la terminal (en Windows: "Git Bash") y configura tu nombre:

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu-correo@ejemplo.com"
```

5. Descarga el proyecto (cambia la dirección por la del repositorio):

```bash
git clone https://github.com/fg2073556-boop/Mt_tienda3d.git
cd Mt_tienda3d
```

## 2. Cada vez que vayas a trabajar

```bash
git checkout main
git pull                              # bajar lo último del equipo
git checkout -b tunombre/tarea        # crear tu rama, ej. ana/modelo-gpu
```

Si alguien agregó paquetes nuevos, vuelve a correr `npm run instalar` en la carpeta del proyecto. Para arrancarlo: `npm run bd` y luego `npm run dev` (la primera vez sigue los pasos del README).

Tus tareas y lo que se revisa para aceptarlas están en `docs/tareas-equipo.md`.

Haz tu trabajo: agrega modelos, edita el CSV, escribe documentación, etc.

## 3. Guardar y subir tu trabajo

```bash
git add .
git commit -m "Agrega modelo 3D de la tarjeta de video"
git push -u origin tunombre/tarea
```

Después entra a GitHub, verás el botón **Compare & pull request**. Dale clic, describe qué hiciste y créalo. Fernando lo revisa y lo une a `main`.

## Reglas del equipo

- Nunca trabajes directo en `main`. Siempre en tu rama.
- Mensajes de commit claros, en español, que digan qué hiciste.
- Nombres de archivo en minúsculas y con guiones: `tarjeta-video.glb`, no `Tarjeta Video FINAL2.glb`.
- Modelos 3D: máximo 20 MB por archivo. Comprímelos en https://gltf.report antes de subirlos a `assets/modelos/web`.
- Nunca subas contraseñas ni llaves de API. El archivo `.env` está ignorado a propósito.
- Si algo sale mal, no borres nada: avísale a Fernando y lo resolvemos juntos.

## Comandos de rescate

```bash
git status                 # ver qué archivos cambiaste
git restore archivo.txt    # deshacer cambios de un archivo que no has guardado
git log --oneline -5       # ver los últimos cambios guardados
```
