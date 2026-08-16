import { Input, Select } from "@/components/ui/FormUI";
import { TextArea } from "@/components/ui/TextArea";
import {
  SPECIES_OPTIONS,
  GENDER_OPTIONS,
  SIZE_OPTIONS,
  TEMPERAMENT_OPTIONS,
  ENERGY_LEVEL_OPTIONS,
  type PetFormValues,
} from "@/types/pet";

interface PetFormFieldsProps {
  values: PetFormValues;
  onChange: (values: PetFormValues) => void;
  errors?: Record<string, string>;
}

export function PetFormFields({ values, onChange, errors = {} }: PetFormFieldsProps) {
  function set<K extends keyof PetFormValues>(key: K, value: PetFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Input label="Name" value={values.name} onChange={(e) => set("name", e.target.value)} error={errors.name} required />
      <Select
        label="Species"
        value={values.species}
        onChange={(e) => set("species", e.target.value as PetFormValues["species"])}
        options={SPECIES_OPTIONS.map((s) => ({ value: s, label: s }))}
        placeholder="Select species"
        error={errors.species}
        required
      />
      <Input label="Breed" value={values.breed} onChange={(e) => set("breed", e.target.value)} error={errors.breed} />
      <Input
        label="Age (years)"
        type="number"
        min={0}
        max={40}
        value={values.age}
        onChange={(e) => set("age", e.target.value)}
        error={errors.age}
      />
      <Select
        label="Gender"
        value={values.gender}
        onChange={(e) => set("gender", e.target.value as PetFormValues["gender"])}
        options={GENDER_OPTIONS.map((g) => ({ value: g, label: g }))}
        placeholder="Select gender"
        error={errors.gender}
        required
      />
      <Select
        label="Size"
        value={values.size}
        onChange={(e) => set("size", e.target.value as PetFormValues["size"])}
        options={SIZE_OPTIONS.map((s) => ({ value: s, label: s }))}
        placeholder="Select size"
        error={errors.size}
      />
      <Input
        label="Weight (kg)"
        type="number"
        min={0}
        step="0.1"
        value={values.weight}
        onChange={(e) => set("weight", e.target.value)}
        error={errors.weight}
      />
      <Select
        label="Temperament"
        value={values.temperament}
        onChange={(e) => set("temperament", e.target.value as PetFormValues["temperament"])}
        options={TEMPERAMENT_OPTIONS.map((t) => ({ value: t, label: t }))}
        placeholder="Select temperament"
        error={errors.temperament}
      />
      <Select
        label="Energy level"
        value={values.energyLevel}
        onChange={(e) => set("energyLevel", e.target.value as PetFormValues["energyLevel"])}
        options={ENERGY_LEVEL_OPTIONS.map((e) => ({ value: e, label: e }))}
        placeholder="Select energy level"
        error={errors.energyLevel}
      />
      <div className="sm:col-span-2">
        <Input
          label="Health status"
          value={values.healthStatus}
          onChange={(e) => set("healthStatus", e.target.value)}
          error={errors.healthStatus}
        />
      </div>
      <div className="sm:col-span-2">
        <TextArea
          label="Description"
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          error={errors.description}
          rows={3}
        />
      </div>
    </div>
  );
}
