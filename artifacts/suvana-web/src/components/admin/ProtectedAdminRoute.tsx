import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { AdminAuthModal } from "@/components/admin/AdminAuthModal";

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

export function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading, authenticate } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-flex h-12 w-12 animate-spin rounded-full border-4 border-border border-t-accent"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AdminAuthModal
        isOpen={true}
        onAuthenticate={authenticate}
        onClose={() => setLocation("/")}
      />
    );
  }

  return <>{children}</>;
}
