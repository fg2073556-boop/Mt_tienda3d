# Openpay.js

Copia de `lib/openpay.v1.min.js` y `lib/openpay-data.v1.min.js` del repositorio oficial
https://github.com/open-pay/openpay-js (versión 1.2.39, commit 6bfac93). Licencia Apache 2.0 (ver LICENSE).

- `openpay.v1.min.js`: convierte los datos de la tarjeta en un **token** directamente con Openpay.
  Los datos de la tarjeta nunca pasan por el servidor de la tienda.
- `openpay-data.v1.min.js`: genera el `device_session_id` para el sistema antifraude de Openpay.

Se cargan desde `client/src/lib/openpay.js` solo en la página de pago.
