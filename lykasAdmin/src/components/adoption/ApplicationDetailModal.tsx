import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select, Input } from "@/components/ui/FormUI";
import { TextArea } from "@/components/ui/TextArea";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { statusTone } from "@/components/ui/statusToneMaps";
import { LoadingState } from "@/components/ui/StateDisplays";
import { api, getErrorMessage } from "@/services/api";
import { useToast } from "@/context/ToastContext";
import { STAGE_OPTIONS, stageLabel, type Application, type VettingStatus } from "@/types/application";

interface ApplicationDetailModalProps {
  applicationId: string | null;
  onClose: () => void;
  onChanged: () => void;
}

export function ApplicationDetailModal({ applicationId, onClose, onChanged }: ApplicationDetailModalProps) {
  const { showToast } = useToast();
  const [application, setApplication] = useState<Application | null>(null);
  const [vetting, setVetting] = useState<VettingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedStage, setSelectedStage] = useState("");
  const [stageNote, setStageNote] = useState("");
  const [savingStage, setSavingStage] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [showScheduleInterview, setShowScheduleInterview] = useState(false);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewMethod, setInterviewMethod] = useState<"In-person" | "Video call" | "Phone call">("In-person");
  const [savingInterview, setSavingInterview] = useState(false);

  const [showScheduleHomeVisit, setShowScheduleHomeVisit] = useState(false);
  const [homeVisitDate, setHomeVisitDate] = useState("");
  const [savingHomeVisit, setSavingHomeVisit] = useState(false);

  const [showRiskForm, setShowRiskForm] = useState(false);
  const [riskScores, setRiskScores] = useState({
    housingStability: 3,
    financialReadiness: 3,
    petExperience: 3,
    lifestyleMatch: 3,
    familyCommitment: 3,
    knowledgeOfPet: 3,
  });
  const [savingRisk, setSavingRisk] = useState(false);

  async function load() {
    if (!applicationId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [appRes, vettingRes] = await Promise.all([
        api.get(`/api/applications/${applicationId}`),
        api.get(`/api/applications/${applicationId}/vetting-status`),
      ]);
      setApplication(appRes.data.data);
      setSelectedStage(appRes.data.data.stage);
      setVetting(vettingRes.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (applicationId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  async function handleStatusChange(status: "approved" | "rejected") {
    if (!application) return;
    setSavingStatus(true);
    try {
      await api.put(`/api/applications/${application._id}/status`, { status });
      showToast(`Application ${status}.`, "success");
      await load();
      onChanged();
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleStageChange() {
    if (!application || !selectedStage) return;
    setSavingStage(true);
    try {
      await api.put(`/api/applications/${application._id}/stage`, { stage: selectedStage, note: stageNote || undefined });
      showToast("Stage updated.", "success");
      setStageNote("");
      await load();
      onChanged();
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setSavingStage(false);
    }
  }

  async function handleAddNote() {
    if (!application || !noteText.trim()) return;
    setSavingNote(true);
    try {
      await api.post(`/api/applications/${application._id}/notes`, { text: noteText });
      setNoteText("");
      await load();
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setSavingNote(false);
    }
  }

  async function handleScheduleInterview() {
    if (!application || !interviewDate) return;
    setSavingInterview(true);
    try {
      await api.post("/api/interviews", {
        application: application._id,
        applicant: application.applicant._id,
        pet: application.pet._id,
        scheduledDate: new Date(interviewDate).toISOString(),
        method: interviewMethod,
      });
      showToast("Interview scheduled.", "success");
      setShowScheduleInterview(false);
      setInterviewDate("");
      await load();
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setSavingInterview(false);
    }
  }

  async function handleScheduleHomeVisit() {
    if (!application || !homeVisitDate) return;
    setSavingHomeVisit(true);
    try {
      await api.post("/api/home-visits", {
        application: application._id,
        applicant: application.applicant._id,
        pet: application.pet._id,
        scheduledDate: new Date(homeVisitDate).toISOString(),
        address: application.address,
      });
      showToast("Home visit scheduled.", "success");
      setShowScheduleHomeVisit(false);
      setHomeVisitDate("");
      await load();
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setSavingHomeVisit(false);
    }
  }

  async function handleSubmitRiskAssessment() {
    if (!application) return;
    setSavingRisk(true);
    try {
      await api.post("/api/risk-assessments", {
        application: application._id,
        applicant: application.applicant._id,
        pet: application.pet._id,
        scores: riskScores,
      });
      showToast("Risk assessment submitted.", "success");
      setShowRiskForm(false);
      await load();
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setSavingRisk(false);
    }
  }

  return (
    <Modal
      isOpen={Boolean(applicationId)}
      onClose={onClose}
      title={application ? `${application.applicant.displayName} — ${application.pet.name}` : "Application"}
      size="xl"
    >
      {isLoading && <LoadingState label="Loading application…" />}
      {error && <p className="text-sm text-status-danger">{error}</p>}

      {application && !isLoading && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 p-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge label={application.status} tone={statusTone.application(application.status)} />
              <StatusBadge label={stageLabel(application.stage)} tone="neutral" />
              <StatusBadge label={application.type} tone="neutral" />
            </div>
            {application.status === "pending" && (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => handleStatusChange("rejected")} isLoading={savingStatus}>
                  Reject
                </Button>
                <Button onClick={() => handleStatusChange("approved")} isLoading={savingStatus}>
                  Approve
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="font-medium text-gray-900">Applicant</p>
              <p className="text-gray-600">{application.applicant.displayName}</p>
              <p className="text-gray-500">{application.applicant.email}</p>
              {application.phone && <p className="text-gray-500">{application.phone}</p>}
              {application.address && <p className="text-gray-500">{application.address}</p>}
            </div>
            <div>
              <p className="font-medium text-gray-900">Pet</p>
              <p className="text-gray-600">
                {application.pet.name} · {application.pet.species}
              </p>
              {application.householdSize !== undefined && (
                <p className="text-gray-500">Household size: {application.householdSize}</p>
              )}
              {application.isRenting && (
                <p className="text-gray-500">
                  Renting {application.landlordApproval ? "(landlord approved)" : "(landlord approval pending)"}
                </p>
              )}
            </div>
            {application.experience && (
              <div className="sm:col-span-2">
                <p className="font-medium text-gray-900">Experience</p>
                <p className="text-gray-600">{application.experience}</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <p className="mb-3 font-medium text-gray-900">Pipeline stage</p>
            <div className="flex flex-wrap items-end gap-3">
              <Select
                label="Move to stage"
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                options={STAGE_OPTIONS.map((s) => ({ value: s, label: stageLabel(s) }))}
              />
              <Input label="Note (optional)" value={stageNote} onChange={(e) => setStageNote(e.target.value)} />
              <Button
                variant="secondary"
                onClick={handleStageChange}
                isLoading={savingStage}
                disabled={selectedStage === application.stage}
              >
                Update stage
              </Button>
            </div>
            {application.stageHistory && application.stageHistory.length > 0 && (
              <ul className="mt-4 flex flex-col gap-1 border-t border-gray-100 pt-3 text-xs text-gray-500">
                {application.stageHistory
                  .slice()
                  .reverse()
                  .map((entry, i) => (
                    <li key={i}>
                      {stageLabel(entry.stage)} — {new Date(entry.changedAt).toLocaleString()}
                      {entry.note ? ` — "${entry.note}"` : ""}
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <p className="mb-3 font-medium text-gray-900">Vetting status</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase text-gray-400">Interview</p>
                {vetting?.interview ? (
                  <StatusBadge label={vetting.interview.result} tone={statusTone.result(vetting.interview.result)} />
                ) : (
                  <div className="mt-1">
                    {showScheduleInterview ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="datetime-local"
                          value={interviewDate}
                          onChange={(e) => setInterviewDate(e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs"
                        />
                        <select
                          value={interviewMethod}
                          onChange={(e) => setInterviewMethod(e.target.value as typeof interviewMethod)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs"
                        >
                          <option>In-person</option>
                          <option>Video call</option>
                          <option>Phone call</option>
                        </select>
                        <Button
                          className="text-xs"
                          onClick={handleScheduleInterview}
                          isLoading={savingInterview}
                          disabled={!interviewDate}
                        >
                          Confirm
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowScheduleInterview(true)}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Schedule
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-400">Home visit</p>
                {vetting?.homeVisit ? (
                  <StatusBadge label={vetting.homeVisit.result} tone={statusTone.result(vetting.homeVisit.result)} />
                ) : (
                  <div className="mt-1">
                    {showScheduleHomeVisit ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="datetime-local"
                          value={homeVisitDate}
                          onChange={(e) => setHomeVisitDate(e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs"
                        />
                        <Button
                          className="text-xs"
                          onClick={handleScheduleHomeVisit}
                          isLoading={savingHomeVisit}
                          disabled={!homeVisitDate}
                        >
                          Confirm
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowScheduleHomeVisit(true)}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Schedule
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-400">Risk assessment</p>
                {vetting?.riskAssessment ? (
                  <StatusBadge
                    label={vetting.riskAssessment.riskLevel}
                    tone={statusTone.riskLevel(vetting.riskAssessment.riskLevel)}
                  />
                ) : showRiskForm ? (
                  <div className="mt-1 flex flex-col gap-1.5">
                    {(Object.keys(riskScores) as (keyof typeof riskScores)[]).map((key) => (
                      <label key={key} className="flex items-center justify-between gap-2 text-xs text-gray-600">
                        {key.replace(/([A-Z])/g, " $1")}
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={riskScores[key]}
                          onChange={(e) =>
                            setRiskScores((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                          }
                          className="w-14 rounded border border-gray-300 px-1 py-0.5 text-xs"
                        />
                      </label>
                    ))}
                    <Button className="mt-1 text-xs" onClick={handleSubmitRiskAssessment} isLoading={savingRisk}>
                      Submit assessment
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowRiskForm(true)}
                    className="mt-1 text-xs font-medium text-primary hover:underline"
                  >
                    Assess
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <p className="mb-3 font-medium text-gray-900">Internal notes (staff only)</p>
            <div className="flex flex-col gap-2">
              {(application.internalNotes || []).length === 0 && (
                <p className="text-xs text-gray-400">No notes yet.</p>
              )}
              {(application.internalNotes || []).map((note) => (
                <div key={note._id} className="rounded bg-gray-50 p-2 text-xs">
                  <p className="text-gray-700">{note.text}</p>
                  <p className="mt-1 text-gray-400">
                    {typeof note.author === "object" ? note.author.displayName : ""} ·{" "}
                    {new Date(note.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <TextArea label="Add a note" value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={2} />
            </div>
            <div className="mt-2 flex justify-end">
              <Button variant="secondary" onClick={handleAddNote} isLoading={savingNote} disabled={!noteText.trim()}>
                Add note
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
