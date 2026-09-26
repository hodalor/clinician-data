import type { AuthSession, AuthTokens } from './types';

type Listener = () => void;

const AUTH_STORAGE_KEY = 'sue-admin-session';

function readStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as AuthSession;
  } catch {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function writeStoredSession(session: AuthSession | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session) {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

let currentSession: AuthSession | null = readStoredSession();
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

export const authStore = {
  getSnapshot: () => currentSession,
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setSession(session: AuthSession) {
    currentSession = session;
    writeStoredSession(session);
    notify();
  },
  updateTokens(tokens: AuthTokens) {
    if (!currentSession) {
      return;
    }

    currentSession = {
      ...currentSession,
      ...tokens,
    };
    writeStoredSession(currentSession);
    notify();
  },
  clearSession() {
    currentSession = null;
    writeStoredSession(null);
    notify();
  },
};
