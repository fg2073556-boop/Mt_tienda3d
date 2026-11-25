/** Error con código HTTP y mensaje para mostrar al usuario. */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Envuelve rutas async para que los errores lleguen al manejador central. */
export const handle = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
