import type { AuthSession, AuthTokens } from './types';

type Listener = () => void;

let currentSession: AuthSession | null = null;
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
    notify();
  },
  clearSession() {
    currentSession = null;
    notify();
  },
};
