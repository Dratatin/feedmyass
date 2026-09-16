/**
 * Format d'erreur commun à tous les points d'entrée (contracts/api.md).
 */

export type ErrorCode =
  | 'validation_error'
  | 'profile_out_of_scope'
  | 'unauthorized'
  | 'not_found'
  | 'reference_data_unavailable';

export const errorStatus: Record<ErrorCode, number> = {
  validation_error: 400,
  profile_out_of_scope: 422,
  unauthorized: 401,
  not_found: 404,
  reference_data_unavailable: 503,
};

export type FieldIssue = { field: string; expected: string };

export type ApiErrorBody = {
  error: { code: ErrorCode; message: string; fields?: FieldIssue[] };
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly fields?: FieldIssue[];

  constructor(code: ErrorCode, message: string, fields?: FieldIssue[]) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.fields = fields;
  }

  get status(): number {
    return errorStatus[this.code];
  }

  toBody(): ApiErrorBody {
    return {
      error: { code: this.code, message: this.message, ...(this.fields ? { fields: this.fields } : {}) },
    };
  }
}

/** Traduit une erreur Zod en réponse 400 nommant chaque champ fautif (FR-002). */
export function validationError(issues: Array<{ path: PropertyKey[]; message: string }>): ApiError {
  const fields: FieldIssue[] = issues.map((issue) => ({
    field: issue.path.map(String).join('.') || '(racine)',
    expected: issue.message,
  }));
  return new ApiError('validation_error', 'Certains champs du profil sont invalides.', fields);
}
