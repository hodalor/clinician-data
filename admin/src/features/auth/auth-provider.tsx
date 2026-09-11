import {
  createContext,
  useCallback,
  useMemo,
  useSyncExternalStore,
  type PropsWithChildren,
} from 'react';
import { authStore } from '../../api/auth-store';
import * as authApi from '../../api/auth-api';
import type { AuthSession } from '../../api/types';

interface AuthContextValue {
  session: AuthSession | null;
  isAuthenticated: boolean;
  setSession: (session: AuthSession) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export { AuthContext };

export function AuthProvider({ children }: PropsWithChildren) {
  const session = useSyncExternalStore(
    authStore.subscribe,
    authStore.getSnapshot,
    authStore.getSnapshot,
  );

  const setSession = useCallback((nextSession: AuthSession) => {
    authStore.setSession(nextSession);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      setSession,
      logout,
    }),
    [logout, session, setSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
