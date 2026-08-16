import { useState, type FormEvent } from "react";
import { Input, Select } from "@/components/ui/FormUI";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { api, getErrorMessage, getFieldErrors } from "@/services/api";
import { EMPTY_APPLICATION_FORM, type ApplicationFormValues } from "@/types/application";

interface SearchOption {
  _id: string;
  label: string;
  sublabel?: string;
}

function SearchField({
  label,
  query,
  onQueryChange,
  results,
  onSelect,
  selectedLabel,
  isSearching,
  placeholder,
}: {
  label: string;
  query: string;
  onQueryChange: (value: string) => void;
  results: SearchOption[];
  onSelect: (option: SearchOption) => void;
  selectedLabel: string;
  isSearching: boolean;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Input label={label} value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder={placeholder} />
      {isSearching && <p className="text-xs text-gray-400">Searching…</p>}
      {!isSearching && results.length > 0 && (
        <ul className="max-h-40 overflow-y-auto rounded-lg border border-gray-200">
          {results.map((opt) => (
            <li key={opt._id}>
              <button
                type="button"
                onClick={() => onSelect(opt)}
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <span className="font-medium text-gray-900">{opt.label}</span>
                {opt.sublabel && <span className="text-gray-500">{opt.sublabel}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selectedLabel && <p className="text-xs text-status-success">Selected: {selectedLabel}</p>}
    </div>
  );
}

interface AdoptionFormProps {
  onSuccess?: () => void;
  initialPetId?: string;
  initialPetName?: string;
}

export function AdoptionForm({ onSuccess, initialPetId, initialPetName }: AdoptionFormProps) {
  const [values, setValues] = useState<ApplicationFormValues>({
    ...EMPTY_APPLICATION_FORM,
    petId: initialPetId || "",
    petName: initialPetName || "",
  });
  const [petQuery, setPetQuery] = useState("");
  const [petResults, setPetResults] = useState<SearchOption[]>([]);
  const [petSearching, setPetSearching] = useState(false);

  const [applicantQuery, setApplicantQuery] = useState("");
  const [applicantResults, setApplicantResults] = useState<SearchOption[]>([]);
  const [applicantSearching, setApplicantSearching] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function set<K extends keyof ApplicationFormValues>(key: K, value: ApplicationFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function searchPets(value: string) {
    setPetQuery(value);
    set("petId", "");
    set("petName", "");
    if (value.trim().length < 2) return setPetResults([]);
    setPetSearching(true);
    try {
      const res = await api.get("/api/pets", { params: { q: value, status: "Available", limit: 5 } });
      setPetResults(
        res.data.data.map((p: { _id: string; name: string; species: string; breed?: string }) => ({
          _id: p._id,
          label: p.name,
          sublabel: `${p.species}${p.breed ? " · " + p.breed : ""}`,
        }))
      );
    } catch {
      setPetResults([]);
    } finally {
      setPetSearching(false);
    }
  }

  async function searchApplicants(value: string) {
    setApplicantQuery(value);
    set("applicantId", "");
    set("applicantName", "");
    if (value.trim().length < 2) return setApplicantResults([]);
    setApplicantSearching(true);
    try {
      const res = await api.get("/api/auth/users", { params: { q: value, role: "user", limit: 5 } });
      setApplicantResults(
        res.data.data.map((u: { _id: string; displayName: string; email: string }) => ({
          _id: u._id,
          label: u.displayName,
          sublabel: u.email,
        }))
      );
    } catch {
      setApplicantResults([]);
    } finally {
      setApplicantSearching(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setErrors({});

    if (!values.petId) return setFormError("Please select a pet.");
    if (!values.applicantId) return setFormError("Please select an applicant.");

    setIsSubmitting(true);
    try {
      await api.post("/api/applications", {
        pet: values.petId,
        applicant: values.applicantId,
        phone: values.phone || undefined,
        address: values.address || undefined,
        experience: values.experience || undefined,
        householdSize: values.householdSize ? Number(values.householdSize) : undefined,
        isRenting: values.isRenting,
        landlordApproval: values.landlordApproval,
        type: values.type,
        fosterPeriod: values.type === "foster" ? values.fosterPeriod || undefined : undefined,
      });
      setSubmitted(true);
      onSuccess?.();
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Alert tone="success">
        Application recorded for {values.applicantName || "the applicant"} — {values.petName || "the selected pet"} is
        now on hold pending review.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {formError && <Alert tone="danger">{formError}</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SearchField
          label="Pet"
          query={petQuery}
          onQueryChange={searchPets}
          results={petResults}
          onSelect={(opt) => {
            set("petId", opt._id);
            set("petName", opt.label);
            setPetQuery(opt.label);
            setPetResults([]);
          }}
          selectedLabel={values.petId ? values.petName : ""}
          isSearching={petSearching}
          placeholder="Search available pets by name…"
        />
        <SearchField
          label="Applicant"
          query={applicantQuery}
          onQueryChange={searchApplicants}
          results={applicantResults}
          onSelect={(opt) => {
            set("applicantId", opt._id);
            set("applicantName", opt.label);
            setApplicantQuery(opt.label);
            setApplicantResults([]);
          }}
          selectedLabel={values.applicantId ? values.applicantName : ""}
          isSearching={applicantSearching}
          placeholder="Search users by name or email…"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Application type"
          value={values.type}
          onChange={(e) => set("type", e.target.value as ApplicationFormValues["type"])}
          options={[
            { value: "adoption", label: "Adoption" },
            { value: "foster", label: "Foster" },
          ]}
          required
        />
        {values.type === "foster" && (
          <Input
            label="Foster period"
            value={values.fosterPeriod}
            onChange={(e) => set("fosterPeriod", e.target.value)}
            placeholder="e.g. 2 weeks"
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Phone" value={values.phone} onChange={(e) => set("phone", e.target.value)} error={errors.phone} />
        <Input
          label="Household size"
          type="number"
          min={0}
          value={values.householdSize}
          onChange={(e) => set("householdSize", e.target.value)}
          error={errors.householdSize}
        />
      </div>

      <Input label="Address" value={values.address} onChange={(e) => set("address", e.target.value)} error={errors.address} />
      <TextArea
        label="Pet ownership experience"
        value={values.experience}
        onChange={(e) => set("experience", e.target.value)}
        error={errors.experience}
        rows={3}
      />

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={values.isRenting} onChange={(e) => set("isRenting", e.target.checked)} />
          Currently renting
        </label>
        {values.isRenting && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={values.landlordApproval}
              onChange={(e) => set("landlordApproval", e.target.checked)}
            />
            Has landlord approval
          </label>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting}>
          Submit application
        </Button>
      </div>
    </form>
  );
}
