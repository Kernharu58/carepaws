import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

type Tone = "success" | "warning" | "danger" | "info";

const toneConfig: Record<Tone, { classes: string; Icon: typeof Info }> = {
  success: { classes: "bg-status-success-bg text-status-success border-status-success/20", Icon: CheckCircle2 },
  warning: { classes: "bg-status-warning-bg text-status-warning border-status-warning/20", Icon: AlertTriangle },
  danger: { classes: "bg-status-danger-bg text-status-danger border-status-danger/20", Icon: XCircle },
  info: { classes: "bg-status-neutral-bg text-status-neutral border-status-neutral/20", Icon: Info },
};

export function Alert({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  const { classes, Icon } = toneConfig[tone];
  return (
    <div role="alert" className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${classes}`}>
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
