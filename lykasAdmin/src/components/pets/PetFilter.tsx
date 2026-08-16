import { Search } from "lucide-react";
import { SPECIES_OPTIONS, STATUS_OPTIONS, SIZE_OPTIONS } from "@/types/pet";

export interface PetFilterValues {
  species: string;
  status: string;
  size: string;
}

interface PetFilterProps {
  q: string;
  onQChange: (q: string) => void;
  filters: PetFilterValues;
  onFiltersChange: (filters: PetFilterValues) => void;
}

export function PetFilter({ q, onQChange, filters, onFiltersChange }: PetFilterProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input
          type="search"
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder="Search pets by name or breed…"
          aria-label="Search pets"
          className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      <select
        value={filters.species}
        onChange={(e) => onFiltersChange({ ...filters, species: e.target.value })}
        aria-label="Filter by species"
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
      >
        <option value="">All species</option>
        {SPECIES_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
        aria-label="Filter by status"
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
      >
        <option value="">All statuses</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={filters.size}
        onChange={(e) => onFiltersChange({ ...filters, size: e.target.value })}
        aria-label="Filter by size"
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
      >
        <option value="">All sizes</option>
        {SIZE_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
