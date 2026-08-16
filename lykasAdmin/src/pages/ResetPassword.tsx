import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PawPrint } from "lucide-react";
import { Input } from "@/components/ui/FormUI";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useToast } from "@/context/ToastContext";
import { api, getErrorMessage } from "@/services/api";

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/api/auth/reset-password", { token, newPassword });
      showToast("Password reset — please sign in.", "success");
      navigate("/login");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <PawPrint className="h-8 w-8 text-primary" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-gray-900">Set a new password</h1>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {!token ? (
            <Alert tone="danger">This reset link is missing its token. Please use the link from your email.</Alert>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && <Alert tone="danger">{error}</Alert>}
              <Input
                label="New password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
              <Input
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
              <Button type="submit" isLoading={isSubmitting} className="w-full">
                Reset password
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-gray-500">
            <Link to="/login" className="font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
