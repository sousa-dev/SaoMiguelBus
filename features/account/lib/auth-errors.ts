import { ApiRequestError } from '@/lib/api-errors';

export type AuthErrorField = 'email' | 'password' | null;

export type AuthUiError = {
  code: string;
  message?: string;
  field: AuthErrorField;
};

const AUTH_ERROR_I18N: Record<string, string> = {
  email_taken: 'authErrorEmailTaken',
  invalid_credentials: 'authErrorInvalidCredentials',
  invalid_social_token: 'authErrorInvalidSocialToken',
  validation_error: 'authErrorValidation',
  network: 'authErrorNetwork',
};

function fieldForCode(code: string, apiField?: string): AuthErrorField {
  if (apiField === 'email' || apiField === 'password') {
    return apiField;
  }
  if (code === 'email_taken') {
    return 'email';
  }
  if (code === 'invalid_credentials' || code === 'validation_error') {
    return 'password';
  }
  return null;
}

export function authErrorFromUnknown(error: unknown): AuthUiError {
  if (error instanceof ApiRequestError) {
    const { code, message, field } = error.parsed;
    return {
      code,
      message,
      field: fieldForCode(code, field),
    };
  }

  if (error instanceof Error && error.message.toLowerCase().includes('network')) {
    return { code: 'network', field: null };
  }

  const message = error instanceof Error ? error.message : undefined;
  return { code: 'unknown', message, field: null };
}

/** User-facing text: known codes use i18n; API field errors use the server message as-is. */
export function formatAuthErrorMessage(
  ui: AuthUiError,
  t: (key: string, options?: Record<string, string>) => string,
): string {
  const apiMessage = ui.message?.trim();
  if (apiMessage && (ui.code === 'validation_error' || ui.code === 'unknown')) {
    return apiMessage;
  }

  const i18nKey = AUTH_ERROR_I18N[ui.code] ?? 'authErrorUnknown';
  return t(i18nKey, {
    message: apiMessage ?? '',
    defaultValue: apiMessage || t('authErrorUnknown'),
  });
}
