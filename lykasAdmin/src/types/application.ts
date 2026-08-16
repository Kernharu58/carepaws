export type ApplicationStatus = "pending" | "approved" | "rejected";
export type ApplicationStage =
  | "submitted"
  | "document_review"
  | "interview"
  | "home_visit"
  | "risk_assessment"
  | "approved"
  | "adoption_scheduled"
  | "completed"
  | "rejected";

export const STAGE_OPTIONS: ApplicationStage[] = [
  "submitted",
  "document_review",
  "interview",
  "home_visit",
  "risk_assessment",
  "approved",
  "adoption_scheduled",
  "completed",
  "rejected",
];

export function stageLabel(stage: string): string {
  return stage
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export interface StageHistoryEntry {
  stage: string;
  changedBy?: { _id: string; displayName: string } | string;
  changedAt: string;
  note?: string;
}

export interface InternalNote {
  _id: string;
  author: { _id: string; displayName: string } | string;
  text: string;
  createdAt: string;
}

export interface Application {
  _id: string;
  pet: { _id: string; name: string; species: string; imageUrl?: string };
  applicant: { _id: string; displayName: string; email: string };
  phone?: string;
  address?: string;
  experience?: string;
  householdSize?: number;
  isRenting?: boolean;
  landlordApproval?: boolean;
  type: "adoption" | "foster";
  fosterPeriod?: string;
  status: ApplicationStatus;
  stage: ApplicationStage;
  stageHistory?: StageHistoryEntry[];
  internalNotes?: InternalNote[];
  createdAt: string;
}

export interface VettingStatus {
  interview: { status: string; result: string } | null;
  homeVisit: { status: string; result: string; recommendation?: string } | null;
  riskAssessment: { riskLevel: string; recommendation?: string } | null;
}

export interface ApplicationFormValues {
  petId: string;
  petName: string;
  applicantId: string;
  applicantName: string;
  phone: string;
  address: string;
  experience: string;
  householdSize: string;
  isRenting: boolean;
  landlordApproval: boolean;
  type: "adoption" | "foster";
  fosterPeriod: string;
}

export const EMPTY_APPLICATION_FORM: ApplicationFormValues = {
  petId: "",
  petName: "",
  applicantId: "",
  applicantName: "",
  phone: "",
  address: "",
  experience: "",
  householdSize: "",
  isRenting: false,
  landlordApproval: false,
  type: "adoption",
  fosterPeriod: "",
};
