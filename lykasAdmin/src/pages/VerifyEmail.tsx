import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PawPrint } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/ui/StateDisplays";
import { api, getErrorMessage } from "@/services/api";

type Status = "verifying" | "success" | "error";

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing its token.");
      return;
    }

    api
      .post("/api/auth/verify-email", { token })
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setMessage(getErrorMessage(err));
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex flex-col items-center gap-2">
          <PawPrint className="h-8 w-8 text-primary" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-gray-900">Verify your email</h1>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {status === "verifying" && <LoadingState label="Verifying your email…" />}
          {status === "success" && <Alert tone="success">Your email has been verified. You can now sign in.</Alert>}
          {status === "error" && <Alert tone="danger">{message}</Alert>}

          <p className="mt-4 text-sm text-gray-500">
            <Link to="/login" className="font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
