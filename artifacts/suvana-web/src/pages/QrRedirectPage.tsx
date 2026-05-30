import { useEffect } from "react";
import { useLocation } from "wouter";

const apiBase = import.meta.env.VITE_API_URL || "";

export default function QrRedirectPage({ source }: { source: string }) {
  const [, navigate] = useLocation();

  useEffect(() => {
    fetch(`${apiBase}/api/qr-scan/${source}`, { method: "POST" }).catch(() => {});
    navigate("/quote", { replace: true });
  }, [source, navigate]);

  return null;
}
