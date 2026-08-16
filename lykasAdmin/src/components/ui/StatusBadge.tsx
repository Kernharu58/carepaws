type StatusTone = "success" | "warning" | "danger" | "neutral";

interface StatusBadgeProps {
  label: string;
  tone: StatusTone;
}

const toneClasses: Record<StatusTone, string> = {
  success: "bg-status-success-bg text-status-success",
  warning: "bg-status-warning-bg text-status-warning",
  danger: "bg-status-danger-bg text-status-danger",
  neutral: "bg-status-neutral-bg text-status-neutral",
};

/**
 * Every place that renders a domain status (Pet.status, Application.status,
 * Volunteer.status, ...) should map its specific enum value to one of
 * these four tones rather than inventing a new color per screen — see
 * statusToneMaps.ts for the mapping tables.
 */
export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}
