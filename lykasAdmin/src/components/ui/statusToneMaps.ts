type Tone = "success" | "warning" | "danger" | "neutral";

const petStatusTones: Record<string, Tone> = {
  Available: "success",
  Pending: "warning",
  Adopted: "neutral",
  Foster: "warning",
};

const applicationStatusTones: Record<string, Tone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

const volunteerStatusTones: Record<string, Tone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  inactive: "neutral",
};

const fosterStatusTones: Record<string, Tone> = {
  active: "success",
  completed: "neutral",
  cancelled: "danger",
};

const paymentStatusTones: Record<string, Tone> = {
  pending: "warning",
  paid: "success",
  failed: "danger",
  refunded: "neutral",
};

const emergencyReportStatusTones: Record<string, Tone> = {
  open: "danger",
  in_progress: "warning",
  resolved: "success",
  dismissed: "neutral",
};

const emergencyReportPriorityTones: Record<string, Tone> = {
  low: "neutral",
  medium: "warning",
  high: "warning",
  critical: "danger",
};

const donationStatusTones: Record<string, Tone> = {
  pending: "warning",
  confirmed: "warning",
  received: "success",
  cancelled: "danger",
};

const identityVerificationTones: Record<string, Tone> = {
  unverified: "neutral",
  pending: "warning",
  verified: "success",
  rejected: "danger",
};

const riskLevelTones: Record<string, Tone> = {
  Low: "success",
  Medium: "warning",
  High: "danger",
};

const resultTones: Record<string, Tone> = {
  passed: "success",
  failed: "danger",
  pending: "warning",
};

function toneOr(map: Record<string, Tone>, value: string, fallback: Tone = "neutral"): Tone {
  return map[value] ?? fallback;
}

export const statusTone = {
  pet: (status: string) => toneOr(petStatusTones, status),
  application: (status: string) => toneOr(applicationStatusTones, status),
  volunteer: (status: string) => toneOr(volunteerStatusTones, status),
  foster: (status: string) => toneOr(fosterStatusTones, status),
  payment: (status: string) => toneOr(paymentStatusTones, status),
  emergencyReport: (status: string) => toneOr(emergencyReportStatusTones, status),
  emergencyPriority: (priority: string) => toneOr(emergencyReportPriorityTones, priority),
  donation: (status: string) => toneOr(donationStatusTones, status),
  identityVerification: (status: string) => toneOr(identityVerificationTones, status),
  riskLevel: (level: string) => toneOr(riskLevelTones, level),
  result: (result: string) => toneOr(resultTones, result),
};
