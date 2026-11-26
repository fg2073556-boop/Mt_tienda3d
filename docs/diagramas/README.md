# Diagramas

| Diagrama | Archivo |
|---|---|
| Flujo de compra del cliente | [flujo-compra.png](flujo-compra.png) |
| Flujo del panel (administrador y vendedor) | [flujo-panel.png](flujo-panel.png) |
| Base de datos (entidad-relación) | [base-de-datos.png](base-de-datos.png) |

Se generan con los scripts de `fuente/` (Python + Playwright) a partir del código real:

```bash
pip install playwright && playwright install chromium
cd docs/diagramas && python fuente/flujos.py && python fuente/base_de_datos.py
```

Si cambia una tabla en `database/schema.sql` o un paso del proceso, actualiza el script y vuelve a generar la imagen.
