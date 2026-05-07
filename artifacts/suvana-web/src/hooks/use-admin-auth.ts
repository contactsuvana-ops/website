import { useEffect, useState } from "react";

const ADMIN_AUTH_KEY = "suvana_admin_session";
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface AuthSession {
  authenticated: boolean;
  timestamp: number;
}

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if there's a valid session on mount
  useEffect(() => {
    const session = sessionStorage.getItem(ADMIN_AUTH_KEY);
    if (session) {
      try {
        const { authenticated, timestamp }: AuthSession = JSON.parse(session);
        const isExpired = Date.now() - timestamp > SESSION_DURATION;
        
        if (authenticated && !isExpired) {
          setIsAuthenticated(true);
        } else {
          sessionStorage.removeItem(ADMIN_AUTH_KEY);
        }
      } catch (e) {
        sessionStorage.removeItem(ADMIN_AUTH_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const authenticate = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/admin/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const session: AuthSession = {
          authenticated: true,
          timestamp: Date.now(),
        };
        sessionStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(session));
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Auth error:", error);
      return false;
    }
  };

  const logout = () => {
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    setIsAuthenticated(false);
  };

  return { isAuthenticated, isLoading, authenticate, logout };
}
