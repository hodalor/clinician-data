import { authStore } from './auth-store';
import { apiBaseUrl } from './config';
import type { ApiErrorPayload, AuthTokens, RefreshPayload } from './types';

export class ApiError extends Error {
  public readonly status: number;
  public readonly payload?: ApiErrorPayload;

  constructor(
    status: number,
    message: string,
    payload?: ApiErrorPayload,
  ) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  withAuth?: boolean;
  retryOnAuthError?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

export async function requestJson<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    body,
    headers,
    withAuth = false,
    retryOnAuthError = withAuth,
    ...rest
  } = options;

  const session = authStore.getSnapshot();
  const requestHeaders = new Headers(headers);

  if (body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (withAuth && session?.access_token) {
    requestHeaders.set('Authorization', `Bearer ${session.access_token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...rest,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && retryOnAuthError && withAuth) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      return requestJson<T>(path, {
        ...options,
        retryOnAuthError: false,
      });
    }
  }

  if (!response.ok) {
    throw await buildApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function requestBlob(
  path: string,
  options: RequestOptions = {},
): Promise<Blob> {
  const { headers, withAuth = false, body, ...rest } = options;
  const session = authStore.getSnapshot();
  const requestHeaders = new Headers(headers);

  if (body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (withAuth && session?.access_token) {
    requestHeaders.set('Authorization', `Bearer ${session.access_token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...rest,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    throw await buildApiError(response);
  }

  return response.blob();
}

function buildUrl(path: string) {
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

async function buildApiError(response: Response) {
  let payload: ApiErrorPayload | undefined;

  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    payload = undefined;
  }

  const message = Array.isArray(payload?.message)
    ? payload.message.join('\n')
    : payload?.message || payload?.error || 'Request failed';

  return new ApiError(response.status, message, payload);
}

async function refreshTokens() {
  if (refreshPromise) {
    return refreshPromise;
  }

  const session = authStore.getSnapshot();
  if (!session?.refresh_token) {
    authStore.clearSession();
    return false;
  }

  refreshPromise = (async () => {
    try {
      const payload: RefreshPayload = {
        refresh_token: session.refresh_token,
      };

      const response = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        authStore.clearSession();
        return false;
      }

      const tokens = (await response.json()) as AuthTokens;
      authStore.updateTokens(tokens);
      return true;
    } catch {
      authStore.clearSession();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
