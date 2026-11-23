/** Error de negocio con código HTTP y un código estable que el cliente puede interpretar. */
export class DomainError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
