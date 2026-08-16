import type { ReactNode } from "react";
import { ErrorBoundary as ReactErrorBoundary, type FallbackProps } from "react-error-boundary";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api } from "@/services/api";

function Fallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <AlertTriangle className="h-10 w-10 text-status-danger" aria-hidden="true" />
      <div>
        <p className="text-base font-semibold text-gray-900">Something went wrong on this page</p>
        <p className="mt-1 text-sm text-gray-500">
          {error instanceof Error ? error.message : "An unexpected error occurred."}
        </p>
      </div>
      <Button onClick={resetErrorBoundary}>Try again</Button>
    </div>
  );
}

export function ErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ReactErrorBoundary
      FallbackComponent={Fallback}
      onError={(error, info) => {
        // §11.5/§11.9 — surface client-side crashes into the same ErrorLog
        // the backend's 500s land in, via the report endpoint built in
        // the System & Admin Ops backend slice. Best-effort: a failure to
        // report the error should never throw a second error.
        api
          .post("/api/errors/report", {
            source: "admin",
            message: error.message,
            stack: error.stack,
            route: window.location.pathname,
            severity: "error",
            metadata: { componentStack: info.componentStack },
          })
          .catch(() => {});
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
