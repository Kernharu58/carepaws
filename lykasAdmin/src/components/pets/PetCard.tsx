import { PawPrint } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { statusTone } from "@/components/ui/statusToneMaps";
import type { Pet } from "@/types/pet";

interface PetCardProps {
  pet: Pet;
  onEdit: (pet: Pet) => void;
}

export function PetCard({ pet, onEdit }: PetCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex h-40 items-center justify-center bg-gray-100">
        {pet.imageUrl ? (
          <img src={pet.imageUrl} alt={pet.name} className="h-full w-full object-cover" />
        ) : (
          <PawPrint className="h-10 w-10 text-gray-300" aria-hidden="true" />
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-gray-900">{pet.name}</p>
            <p className="text-sm text-gray-500">
              {pet.breed || pet.species} · {pet.gender}
            </p>
          </div>
          <StatusBadge label={pet.status} tone={statusTone.pet(pet.status)} />
        </div>
        <button
          onClick={() => onEdit(pet)}
          className="mt-3 text-sm font-medium text-primary hover:underline"
        >
          Edit details
        </button>
      </div>
    </div>
  );
}
