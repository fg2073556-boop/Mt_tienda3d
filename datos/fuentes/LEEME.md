# Fuentes de datos de envíos

| Dato | Repositorio | Archivo | Licencia |
|---|---|---|---|
| Códigos postales y colonias (catálogo SEPOMEX) | https://github.com/IcaliaLabs/sepomex | `lib/sepomex_db.csv` | MIT |
| Límites de los 217 municipios de Puebla (INEGI) | https://github.com/PhantomInsights/mexico-geojson | `2021/states/Puebla.json` | MIT |

`generar_envios.py` toma esos dos archivos y crea:

- `database/migraciones/008-envios.sql`: zonas de envío y municipios con su distancia a la tienda (Tepeaca).
- `database/migraciones/009-codigos-postales-puebla.sql`: 6,401 colonias y 1,566 códigos postales de Puebla.
- `client/public/mapas/puebla-municipios.json`: mapa simplificado (26 KB) para dibujar las zonas.

Para regenerarlos (por ejemplo, si cambian las distancias de las zonas):

```bash
git clone --depth 1 https://github.com/IcaliaLabs/sepomex /tmp/sepomex
git clone --depth 1 --filter=blob:none --sparse https://github.com/PhantomInsights/mexico-geojson /tmp/mexgeo
git -C /tmp/mexgeo sparse-checkout set --no-cone /2021/states/Puebla.json
python3 datos/fuentes/generar_envios.py /tmp/sepomex/lib/sepomex_db.csv /tmp/mexgeo/2021/states/Puebla.json
```
