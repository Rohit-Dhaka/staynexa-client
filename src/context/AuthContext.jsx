import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import api, {
  setAccessToken,
  setAuthHandlers,
  refreshSession,
} from "../api/axiosInstance";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((session) => {
    setAccessToken(session.accessToken);
    setToken(session.accessToken);
    setUser(session.user);
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setAuthHandlers({ onRefreshed: applySession, onFailure: clearSession });

    let active = true;

    refreshSession()
      .then((session) => {
        if (active) applySession(session);
      })
      .catch(() => {
        if (active) clearSession();
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [applySession, clearSession]);

  const login = useCallback(
    async (credentials) => {
      const res = await api.post("/auth/login", credentials);
      applySession(res.data.data);
      return res.data.data.user;
    },
    [applySession]
  );

  const guestSignup = useCallback(
    async (data) => {
      const res = await api.post("/auth/guest/signup", data);
      applySession(res.data.data);
      return res.data.data.user;
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const changePassword = useCallback(
    async (data) => {
      await api.patch("/auth/change-password", data);
      clearSession();
    },
    [clearSession]
  );

  const value = useMemo(
    () => ({
      user,
      accessToken,
      loading,
      isAuthenticated: Boolean(user),
      login,
      guestSignup,
      logout,
      changePassword,
    }),
    [user, accessToken, loading, login, guestSignup, logout, changePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};