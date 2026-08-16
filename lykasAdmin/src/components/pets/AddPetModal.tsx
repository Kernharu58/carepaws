import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { PetFormFields } from "./PetFormFields";
import { EMPTY_PET_FORM, petFormToPayload, type Pet, type PetFormValues } from "@/types/pet";
import { api, getErrorMessage, getFieldErrors } from "@/services/api";
import { useToast } from "@/context/ToastContext";

interface AddPetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (pet: Pet) => void;
}

export function AddPetModal({ isOpen, onClose, onCreated }: AddPetModalProps) {
  const { showToast } = useToast();
  const [values, setValues] = useState<PetFormValues>(EMPTY_PET_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleClose() {
    setValues(EMPTY_PET_FORM);
    setErrors({});
    setFormError(null);
    onClose();
  }

  async function handleSubmit() {
    setFormError(null);
    setErrors({});
    setIsSubmitting(true);
    try {
      const res = await api.post("/api/pets", petFormToPayload(values));
      showToast(`${values.name} added.`, "success");
      onCreated(res.data.data);
      handleClose();
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add a pet"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>
            Add pet
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {formError && <Alert tone="danger">{formError}</Alert>}
        <PetFormFields values={values} onChange={setValues} errors={errors} />
      </div>
    </Modal>
  );
}
