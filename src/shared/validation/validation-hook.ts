import type { ErrorResponseBody } from "../../shared/errors/error-response.types";

type ValidationErrorDetail = ErrorResponseBody["error"]["details"][number];

/**
 * Hook para sValidator que convierte errores de validación
 * al contrato global { error: { code, message, details } }.
 */
export const validationHook = (
  result: { success: boolean; error?: unknown },
  c: { json: (body: unknown, status: number) => Response },
): Response | void => {
  if (result.success) return;

  const issues = extractIssues(result.error);
  const details: ValidationErrorDetail[] = flattenIssues(issues);

  const body: ErrorResponseBody = {
    error: {
      code: "VALIDATION_ERROR",
      message: "Los datos enviados no son válidos",
      details,
    },
  };

  return c.json(body, 400);
};

interface RawIssue {
  message: string;
  code?: string;
  path?: (string | number)[];
  issues?: RawIssue[];
}

function extractIssues(error: unknown): RawIssue[] {
  if (Array.isArray(error)) return error as RawIssue[];
  return [];
}

function flattenIssues(issues: RawIssue[], parentPath: string[] = []): ValidationErrorDetail[] {
  const result: ValidationErrorDetail[] = [];

  for (const issue of issues) {
    const currentPath = [...parentPath, ...(issue.path?.map(String) ?? [])];
    const field = currentPath.join(".");

    if (issue.issues && issue.issues.length > 0) {
      result.push(...flattenIssues(issue.issues, currentPath));
    } else {
      result.push({
        field,
        code: issue.code ?? "invalid",
        message: issue.message,
      });
    }
  }

  return result;
}
