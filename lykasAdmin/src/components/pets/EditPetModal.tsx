import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { PetFormFields } from "./PetFormFields";
import { petToFormValues, petFormToPayload, type Pet, type PetFormValues } from "@/types/pet";
import { api, getErrorMessage, getFieldErrors } from "@/services/api";
import { useToast } from "@/context/ToastContext";

interface EditPetModalProps {
  isOpen: boolean;
  pet: Pet | null;
  onClose: () => void;
  onUpdated: (pet: Pet) => void;
}

export function EditPetModal({ isOpen, pet, onClose, onUpdated }: EditPetModalProps) {
  const { showToast } = useToast();
  const [values, setValues] = useState<PetFormValues | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (pet) setValues(petToFormValues(pet));
  }, [pet]);

  function handleClose() {
    setErrors({});
    setFormError(null);
    onClose();
  }

  async function handleSubmit() {
    if (!pet || !values) return;
    setFormError(null);
    setErrors({});
    setIsSubmitting(true);
    try {
      const res = await api.put(`/api/pets/${pet._id}`, petFormToPayload(values));
      showToast(`${values.name} updated.`, "success");
      onUpdated(res.data.data);
      handleClose();
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!values) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Edit ${pet?.name ?? "pet"}`}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>
            Save changes
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
