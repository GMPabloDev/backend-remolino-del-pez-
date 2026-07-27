import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { DomainException } from "./domain.exception";
import type { ErrorResponseBody } from "./error-response.types";

/**
 * Manejador global de errores para Hono.
 * Convierte excepciones de dominio, HTTP y errores inesperados
 * al contrato { error: { code, message, details } }.
 */
export function errorHandler(err: Error, c: Context): Response {
  // Errores HTTP lanzados intencionalmente desde casos de uso o rutas
  if (err instanceof HTTPException) {
    return buildErrorResponse(c, err.status as ContentfulStatusCode, "UNKNOWN_ERROR", err.message, []);
  }

  // Excepciones de dominio: 409 Conflict por defecto (puede sobrescribirse)
  if (err instanceof DomainException) {
    return buildErrorResponse(c, 409 as ContentfulStatusCode, err.message, err.message, []);
  }

  // Error inesperado: no exponer detalles internos
  console.error("[UNEXPECTED]", err);
  return buildErrorResponse(
    c,
    500 as ContentfulStatusCode,
    "INTERNAL_SERVER_ERROR",
    "Error interno del servidor",
    [],
  );
}

function buildErrorResponse(
  c: Context,
  status: ContentfulStatusCode,
  code: string,
  message: string,
  details: ErrorResponseBody["error"]["details"],
): Response {
  const body: ErrorResponseBody = {
    error: { code, message, details },
  };
  return c.json(body, status);
}
