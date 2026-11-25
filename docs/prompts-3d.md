# Prompts para generar las piezas 3D

## Flujo

1. Genera una imagen de referencia con Gemini (Nano Banana) usando el prompt de imagen. Guárdala en `assets/referencias/`.
2. Súbela a Tripo o Meshy con la opción **Image to 3D**.
3. Descarga el resultado en `.glb` y guárdalo en `assets/modelos/originales/`.
4. Comprímelo en https://gltf.report y guarda la versión final en `assets/modelos/web/`.

Genera cada pieza por separado para que la vista "por dentro" funcione.

## Estilo base (pegar al final de cada prompt)

```
, product render style, clean PBR materials, matte black and dark gunmetal finish, subtle mint green RGB accent lighting, no logos, no text, no brand names, centered, isolated object, realistic proportions, game-ready, optimized low-poly mesh
```

## Prompt negativo

```
text, logos, watermark, letters, brand, blurry, melted geometry, extra parts, floating pieces, base, pedestal, ground plane, people, hands
```

## Prompt de imagen para Gemini

```
Studio product photo of a [PIEZA EN INGLÉS], three-quarter front view, plain light gray background, soft even lighting, sharp focus, entire object visible, no shadows on background, no text, no logos, high detail
```

## Prompts por pieza

| Archivo final | Prompt |
|---|---|
| `gabinete.glb` | Mid-tower gaming PC case, empty interior with no components inside, tempered glass side panel, three front fan slots, dark matte black metal frame, power supply shroud at the bottom |
| `pc-fenix.glb` | Mid-tower gaming PC with tempered glass side panel, visible graphics card, liquid CPU cooler, RGB RAM sticks and three front RGB fans glowing mint green, matte black case |
| `tarjeta-video.glb` | Modern desktop graphics card, dual fan design, dark gunmetal shroud with a thin mint green LED strip on the side, metal backplate, PCIe connector visible |
| `procesador.glb` | Desktop CPU processor chip, square silver metal heat spreader on top, green circuit substrate underneath, flat and thin, top three-quarter view |
| `memoria-ram.glb` | Pair of DDR5 desktop RAM sticks standing side by side, black aluminum heat spreaders, diffused RGB light bar on top glowing mint green, gold contact pins at the bottom |
| `ssd.glb` | M.2 NVMe SSD stick, small thin rectangular circuit board, black heatsink label area, gold connector pins on one end, flat object |
| `fuente.glb` | ATX desktop power supply unit, rectangular matte black metal box, large ventilation fan grille on top, modular cable ports on the back, small mint green accent line |
| `ventilador.glb` | 120mm computer case fan, seven translucent blades, black square frame, glowing mint green RGB ring around the blades |
| `enfriamiento.glb` | 240mm all-in-one liquid CPU cooler, round pump head with glowing mint green RGB ring, two black rubber tubes connected to a slim radiator with two fans |
| `monitor.glb` | 27 inch thin-bezel desktop gaming monitor, flat screen turned off showing dark glass, slim black stand with a rectangular base, modern minimal design |
| `teclado-mouse.glb` | Mechanical gaming keyboard with black keycaps and subtle mint green underglow, plus a matching ergonomic gaming mouse placed to the right, set of two objects |
| `escritorio.glb` | Modern ergonomic computer desk, 140 cm wide, dark charcoal wood top, black metal legs, cable management tray underneath, minimalist |
| `silla.glb` | Ergonomic office chair, black breathable mesh backrest, lumbar support, adjustable armrests, five-star base with wheels, modern design |

## Ajustes al exportar

| Opción | Valor |
|---|---|
| Formato | GLB |
| Polígonos | 10,000–30,000 por pieza |
| Texturas | 1K o 2K, PBR |
| Escala | Real, en metros |

## Avance

| Pieza | Referencia | Modelo original | Modelo web | Responsable |
|---|---|---|---|---|
| Gabinete | [ ] | [ ] | [ ] | |
| PC Fénix | [ ] | [ ] | [ ] | |
| Tarjeta de video | [ ] | [ ] | [ ] | |
| Procesador | [ ] | [ ] | [ ] | |
| Memoria RAM | [ ] | [ ] | [ ] | |
| SSD | [ ] | [ ] | [ ] | |
| Fuente | [ ] | [ ] | [ ] | |
| Ventilador | [ ] | [ ] | [ ] | |
| Enfriamiento | [ ] | [ ] | [ ] | |
| Monitor | [ ] | [ ] | [ ] | |
| Teclado y mouse | [ ] | [ ] | [ ] | |
| Escritorio | [ ] | [ ] | [ ] | |
| Silla | [ ] | [ ] | [ ] | |
