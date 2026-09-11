import { authStore } from './auth-store';
import { requestJson } from './http';
import type { AuthSession, AuthTokens, LoginPayload, LogoutPayload } from './types';

export async function login(payload: LoginPayload) {
  const session = await requestJson<AuthSession>('/auth/login', {
    method: 'POST',
    body: payload,
  });

  authStore.setSession(session);
  return session;
}

export async function logout() {
  const session = authStore.getSnapshot();

  if (session?.refresh_token) {
    const payload: LogoutPayload = {
      refresh_token: session.refresh_token,
    };

    try {
      await requestJson<{ success: boolean }>('/auth/logout', {
        method: 'POST',
        body: payload,
      });
    } catch {
      // Ignore logout network failures and still clear memory-held tokens.
    }
  }

  authStore.clearSession();
}

export function getActiveSession() {
  return authStore.getSnapshot();
}

export function updateSessionTokens(tokens: AuthTokens) {
  authStore.updateTokens(tokens);
}
