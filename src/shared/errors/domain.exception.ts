import type { ErrorDetail } from "./error-response.types";

/**
 * Excepción base para errores de dominio.
 * Cada módulo extiende esta clase en sus propios archivos de excepción.
 *
 * @param code    Código de error en inglés (ej. "RESTAURANT_NOT_FOUND")
 * @param message Mensaje legible en español (ej. "El restaurante no existe")
 * @param statusCode Código HTTP (por defecto 409)
 * @param details Detalles estructurados opcionales para la respuesta pública
 */
export class DomainException extends Error {
	readonly code: string;
	readonly statusCode: number;
	readonly details: ErrorDetail[];

	constructor(
		code: string,
		message: string,
		statusCode = 409,
		details: ErrorDetail[] = [],
	) {
		super(message);
		this.name = "DomainException";
		this.code = code;
		this.statusCode = statusCode;
		this.details = details;
	}
}
