import { useState } from "react";
import { Lock, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AdminAuthModalProps {
  isOpen: boolean;
  onAuthenticate: (username: string, password: string) => Promise<boolean>;
  onClose?: () => void;
  isLoading?: boolean;
}

export function AdminAuthModal({
  isOpen,
  onAuthenticate,
  onClose,
  isLoading = false,
}: AdminAuthModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const success = await onAuthenticate(username, password);
      if (!success) {
        setError("Invalid credentials");
        setPassword("");
      } else {
        setUsername("");
        setPassword("");
      }
    } catch (err) {
      setError("Authentication failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent 
        className="sm:max-w-[400px]" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          onClose?.();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Admin Access
          </DialogTitle>
          <DialogDescription>
            Enter your credentials to access the admin dashboard
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              Username
            </label>
            <Input
              id="username"
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
              autoComplete="username"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || isLoading || !username || !password}
            >
              {isSubmitting ? "Authenticating..." : "Access Dashboard"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
