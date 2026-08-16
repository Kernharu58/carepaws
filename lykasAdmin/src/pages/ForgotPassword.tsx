import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PawPrint } from "lucide-react";
import { Input } from "@/components/ui/FormUI";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { api, getErrorMessage } from "@/services/api";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post("/api/auth/forgot-password", { email });
      setSubmitted(true);
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
          <h1 className="text-xl font-semibold text-gray-900">Reset your password</h1>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {submitted ? (
            <Alert tone="success">
              If an account exists for that email, we've sent a link to reset your password.
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && <Alert tone="danger">{error}</Alert>}
              <p className="text-sm text-gray-600">
                Enter the email on your account and we'll send you a reset link.
              </p>
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" isLoading={isSubmitting} className="w-full">
                Send reset link
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
