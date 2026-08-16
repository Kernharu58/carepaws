import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/SharedUI";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/StateDisplays";
import { Pagination } from "@/components/ui/SharedUI";
import { Button } from "@/components/ui/Button";
import { PetCard } from "@/components/pets/PetCard";
import { PetFilter, type PetFilterValues } from "@/components/pets/PetFilter";
import { AddPetModal } from "@/components/pets/AddPetModal";
import { EditPetModal } from "@/components/pets/EditPetModal";
import { useListQuery } from "@/hooks/useListQuery";
import type { Pet } from "@/types/pet";

export function ManagePets() {
  const [filters, setFilters] = useState<PetFilterValues>({ species: "", status: "", size: "" });
  const { data, pagination, isLoading, error, setPage, q, setQ, refetch } = useListQuery<Pet>(
    "/api/pets/admin",
    { filters }
  );

  const [addOpen, setAddOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);

  return (
    <div>
      <PageHeader
        title="Manage Pets"
        description="Browse the full pet roster and make quick edits."
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add pet
          </Button>
        }
      />

      <PetFilter q={q} onQChange={setQ} filters={filters} onFiltersChange={setFilters} />

      {isLoading && <LoadingState label="Loading pets…" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!isLoading && !error && data.length === 0 && (
        <EmptyState title="No pets found" description="Try adjusting your filters, or add a new pet." />
      )}

      {!isLoading && !error && data.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.map((pet) => (
              <PetCard key={pet._id} pet={pet} onEdit={setEditingPet} />
            ))}
          </div>
          {pagination && pagination.pages > 1 && (
            <div className="mt-4">
              <Pagination pagination={pagination} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      <AddPetModal isOpen={addOpen} onClose={() => setAddOpen(false)} onCreated={refetch} />
      <EditPetModal
        isOpen={Boolean(editingPet)}
        pet={editingPet}
        onClose={() => setEditingPet(null)}
        onUpdated={refetch}
      />
    </div>
  );
}
