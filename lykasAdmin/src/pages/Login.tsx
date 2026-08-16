import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { PawPrint } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Input } from "@/components/ui/FormUI";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { api, getErrorMessage } from "@/services/api";
import { setAccessToken, setRefreshToken } from "@/services/tokenStore";

export function Login() {
  const { login, refreshUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      showToast("Welcome back!", "success");
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSuccess(credential: CredentialResponse) {
    if (!credential.credential) return;
    setError(null);
    try {
      const res = await api.post("/api/auth/google", { idToken: credential.credential });
      setAccessToken(res.data.data.accessToken);
      setRefreshToken(res.data.data.refreshToken);
      await refreshUser();
      showToast("Welcome back!", "success");
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <PawPrint className="h-8 w-8 text-primary" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-gray-900">CarePaws Shelter Console</h1>
          <p className="text-sm text-gray-500">Sign in to manage pets, applications, and more.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {error && <Alert tone="danger">{error}</Alert>}

          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Sign in
          </Button>

          <div className="relative py-2 text-center text-xs text-gray-400">
            <span className="relative bg-white px-2">or</span>
            <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-gray-200" />
          </div>

          <div className="flex justify-center">
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError("Google sign-in failed")} />
          </div>
        </form>
      </div>
    </div>
  );
}
