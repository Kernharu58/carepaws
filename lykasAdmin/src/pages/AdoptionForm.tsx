import { useSearchParams } from "react-router-dom";
import { Card, PageHeader } from "@/components/ui/SharedUI";
import { AdoptionForm as AdoptionFormComponent } from "@/components/adoption/AdoptionForm";

/**
 * The routed page for recording a new adoption/foster application on
 * behalf of a walk-in applicant. Composes the reusable form component in
 * components/adoption/AdoptionForm.tsx — two different files with the
 * same name in the source project, kept separate here for the same
 * reason (§12.4): one is the page, one is the form the page renders.
 */
export function AdoptionForm() {
  const [searchParams] = useSearchParams();
  const petId = searchParams.get("petId") || undefined;
  const petName = searchParams.get("petName") || undefined;

  return (
    <div>
      <PageHeader
        title="New Application"
        description="Record an adoption or foster application on behalf of a walk-in applicant."
      />
      <Card className="max-w-2xl p-6">
        <AdoptionFormComponent initialPetId={petId} initialPetName={petName} />
      </Card>
    </div>
  );
}
