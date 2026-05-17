import { useEffect, useState } from "react";

const ADMIN_AUTH_KEY = "suvana_admin_session";
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface AuthSession {
  authenticated: boolean;
  token: string;
  timestamp: number;
}

export function getAdminToken(): string | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_AUTH_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (!session.authenticated || !session.token) return null;
    if (Date.now() - session.timestamp > SESSION_DURATION) return null;
    return session.token;
  } catch {
    return null;
  }
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
      const apiUrl = import.meta.env.VITE_API_URL || "";
      const endpoint = apiUrl 
        ? `${apiUrl}/api/admin/authenticate`
        : "/api/admin/authenticate";
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        const session: AuthSession = {
          authenticated: true,
          token: data.token ?? "",
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
