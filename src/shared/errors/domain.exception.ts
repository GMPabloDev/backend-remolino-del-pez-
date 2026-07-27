/**
 * Excepción base para errores de dominio.
 * Cada módulo extiende esta clase en sus propios archivos de excepción.
 */
export class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainException";
  }
}
