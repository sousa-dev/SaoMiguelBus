/** Parsed body from a failed `apiFetch` (v3 envelope or DRF field errors). */
export type ApiErrorPayload = {
  code: string;
  message?: string;
  field?: string;
};

export class ApiRequestError extends Error {
  readonly status: number;
  readonly rawBody: string;
  readonly parsed: ApiErrorPayload;

  constructor(status: number, rawBody: string, parsed: ApiErrorPayload) {
    super(`API ${status}: ${parsed.code}`);
    this.name = 'ApiRequestError';
    this.status = status;
    this.rawBody = rawBody;
    this.parsed = parsed;
  }
}

export function parseApiErrorBody(body: string): ApiErrorPayload {
  try {
    const json = JSON.parse(body) as Record<string, unknown>;
    const envelope = json.error;
    if (envelope && typeof envelope === 'object' && !Array.isArray(envelope)) {
      const err = envelope as { code?: string; message?: string };
      return {
        code: err.code ?? 'unknown',
        message: typeof err.message === 'string' ? err.message : undefined,
      };
    }

    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(json)) {
      if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
        fieldErrors[key] = value;
      }
    }
    if (Object.keys(fieldErrors).length > 0) {
      const field = Object.keys(fieldErrors)[0];
      return {
        code: 'validation_error',
        message: fieldErrors[field][0],
        field,
      };
    }
  } catch {
    // Non-JSON body (HTML proxy errors, etc.)
  }

  const trimmed = body.trim();
  return {
    code: 'unknown',
    message: trimmed ? trimmed.slice(0, 300) : undefined,
  };
}
