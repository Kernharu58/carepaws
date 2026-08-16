import { useState } from "react";
import { Plus, Pencil, Trash2, RotateCcw, XCircle, Heart } from "lucide-react";
import { PageHeader, Card, Table, Th, Td, Tr, Pagination } from "@/components/ui/SharedUI";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/StateDisplays";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { statusTone } from "@/components/ui/statusToneMaps";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/FormUI";
import { PetFilter, type PetFilterValues } from "@/components/pets/PetFilter";
import { AddPetModal } from "@/components/pets/AddPetModal";
import { EditPetModal } from "@/components/pets/EditPetModal";
import { useListQuery } from "@/hooks/useListQuery";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api, getErrorMessage } from "@/services/api";
import type { Pet } from "@/types/pet";

interface AdopterOption {
  _id: string;
  displayName: string;
  email: string;
}

function AdoptPetModal({
  pet,
  onClose,
  onAdopted,
}: {
  pet: Pet | null;
  onClose: () => void;
  onAdopted: () => void;
}) {
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdopterOption[]>([]);
  const [selected, setSelected] = useState<AdopterOption | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(value: string) {
    setQuery(value);
    setSelected(null);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.get("/api/auth/users", { params: { q: value, role: "user", limit: 5 } });
      setResults(res.data.data);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleConfirm() {
    if (!pet || !selected) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await api.post(`/api/pets/${pet._id}/adopt`, { userId: selected._id });
      showToast(`${pet.name} marked as adopted by ${selected.displayName}.`, "success");
      onAdopted();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={Boolean(pet)}
      onClose={onClose}
      title={`Finalize adoption — ${pet?.name ?? ""}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selected} isLoading={isSubmitting}>
            Confirm adoption
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error && <p className="text-sm text-status-danger">{error}</p>}
        <Input
          label="Search for the adopter by name or email"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="e.g. ada@example.com"
        />
        {isSearching && <p className="text-sm text-gray-400">Searching…</p>}
        {!isSearching && results.length > 0 && (
          <ul className="max-h-48 overflow-y-auto rounded-lg border border-gray-200">
            {results.map((user) => (
              <li key={user._id}>
                <button
                  onClick={() => setSelected(user)}
                  className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    selected?._id === user._id ? "bg-emerald-50" : ""
                  }`}
                >
                  <span className="font-medium text-gray-900">{user.displayName}</span>
                  <span className="text-gray-500">{user.email}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {selected && (
          <p className="text-sm text-gray-600">
            Adopting to <span className="font-medium">{selected.displayName}</span> ({selected.email})
          </p>
        )}
      </div>
    </Modal>
  );
}

export function PetManagement() {
  const { hasRole } = useAuth();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<PetFilterValues>({ species: "", status: "", size: "" });
  const [showDeleted, setShowDeleted] = useState(false);

  const { data, pagination, isLoading, error, setPage, q, setQ, refetch } = useListQuery<Pet>(
    "/api/pets/admin",
    { filters: { ...filters, includeDeleted: showDeleted ? "true" : undefined } }
  );

  const [addOpen, setAddOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [deletingPet, setDeletingPet] = useState<Pet | null>(null);
  const [permDeletingPet, setPermDeletingPet] = useState<Pet | null>(null);
  const [adoptingPet, setAdoptingPet] = useState<Pet | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function handleDelete() {
    if (!deletingPet) return;
    setActionLoading(true);
    try {
      await api.delete(`/api/pets/${deletingPet._id}`);
      showToast(`${deletingPet.name} deleted.`, "success");
      refetch();
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setActionLoading(false);
      setDeletingPet(null);
    }
  }

  async function handleRestore(pet: Pet) {
    try {
      await api.post(`/api/pets/${pet._id}/restore`);
      showToast(`${pet.name} restored.`, "success");
      refetch();
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  }

  async function handlePermanentDelete() {
    if (!permDeletingPet) return;
    setActionLoading(true);
    try {
      await api.delete(`/api/pets/${permDeletingPet._id}/permanent`);
      showToast(`${permDeletingPet.name} permanently deleted.`, "success");
      refetch();
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setActionLoading(false);
      setPermDeletingPet(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Pet Management"
        description="The full pet CRUD workspace — including adopted, fostered, and archived pets."
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add pet
          </Button>
        }
      />

      <div className="mb-4 flex items-center justify-between">
        <PetFilter q={q} onQChange={setQ} filters={filters} onFiltersChange={setFilters} />
        <label className="ml-3 flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />
          Show deleted
        </label>
      </div>

      {isLoading && <LoadingState label="Loading pets…" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!isLoading && !error && data.length === 0 && <EmptyState title="No pets match these filters" />}

      {!isLoading && !error && data.length > 0 && (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Species / Breed</Th>
                <Th>Status</Th>
                <Th>Added</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {data.map((pet) => (
                <Tr key={pet._id}>
                  <Td className="font-medium text-gray-900">{pet.name}</Td>
                  <Td>
                    {pet.species}
                    {pet.breed ? ` · ${pet.breed}` : ""}
                  </Td>
                  <Td>
                    {pet.isDeleted ? (
                      <StatusBadge label="Deleted" tone="danger" />
                    ) : (
                      <StatusBadge label={pet.status} tone={statusTone.pet(pet.status)} />
                    )}
                  </Td>
                  <Td>{new Date(pet.createdAt).toLocaleDateString()}</Td>
                  <Td>
                    <div className="flex gap-1">
                      {!pet.isDeleted && (
                        <>
                          <button
                            onClick={() => setEditingPet(pet)}
                            aria-label={`Edit ${pet.name}`}
                            title="Edit"
                            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {["Available", "Pending"].includes(pet.status) && (
                            <button
                              onClick={() => setAdoptingPet(pet)}
                              aria-label={`Finalize adoption for ${pet.name}`}
                              title="Finalize adoption"
                              className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-status-success"
                            >
                              <Heart className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setDeletingPet(pet)}
                            aria-label={`Delete ${pet.name}`}
                            title="Delete"
                            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-status-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {pet.isDeleted && (
                        <>
                          <button
                            onClick={() => handleRestore(pet)}
                            aria-label={`Restore ${pet.name}`}
                            title="Restore"
                            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-status-success"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                          {hasRole("super_admin") && (
                            <button
                              onClick={() => setPermDeletingPet(pet)}
                              aria-label={`Permanently delete ${pet.name}`}
                              title="Permanently delete"
                              className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-status-danger"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          {pagination && pagination.pages > 1 && <Pagination pagination={pagination} onPageChange={setPage} />}
        </Card>
      )}

      <AddPetModal isOpen={addOpen} onClose={() => setAddOpen(false)} onCreated={refetch} />
      <EditPetModal
        isOpen={Boolean(editingPet)}
        pet={editingPet}
        onClose={() => setEditingPet(null)}
        onUpdated={refetch}
      />
      <AdoptPetModal pet={adoptingPet} onClose={() => setAdoptingPet(null)} onAdopted={refetch} />

      <ConfirmModal
        isOpen={Boolean(deletingPet)}
        onClose={() => setDeletingPet(null)}
        onConfirm={handleDelete}
        title="Delete pet"
        message={`This will remove "${deletingPet?.name}" from public listings. It can be restored later.`}
        confirmLabel="Delete"
        isLoading={actionLoading}
      />
      <ConfirmModal
        isOpen={Boolean(permDeletingPet)}
        onClose={() => setPermDeletingPet(null)}
        onConfirm={handlePermanentDelete}
        title="Permanently delete pet"
        message={`This cannot be undone. "${permDeletingPet?.name}" and its record will be gone for good.`}
        confirmLabel="Permanently delete"
        isLoading={actionLoading}
      />
    </div>
  );
}
