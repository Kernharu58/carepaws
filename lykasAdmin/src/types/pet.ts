export type PetSpecies = "Dog" | "Cat" | "Other";
export type PetGender = "Male" | "Female";
export type PetSize = "Small" | "Medium" | "Large";
export type PetTemperament = "Calm" | "Playful" | "Shy" | "Energetic" | "Affectionate" | "Independent";
export type PetEnergyLevel = "Low" | "Medium" | "High";
export type PetStatus = "Available" | "Pending" | "Adopted" | "Foster";

export interface Pet {
  _id: string;
  name: string;
  species: PetSpecies;
  breed?: string;
  age?: number;
  gender: PetGender;
  size?: PetSize;
  weight?: number;
  temperament?: PetTemperament;
  energyLevel?: PetEnergyLevel;
  healthStatus?: string;
  description?: string;
  imageUrl?: string;
  status: PetStatus;
  owner?: string;
  isDeleted?: boolean;
  createdAt: string;
}

export interface PetFormValues {
  name: string;
  species: PetSpecies | "";
  breed: string;
  age: string;
  gender: PetGender | "";
  size: PetSize | "";
  weight: string;
  temperament: PetTemperament | "";
  energyLevel: PetEnergyLevel | "";
  healthStatus: string;
  description: string;
}

export const SPECIES_OPTIONS: PetSpecies[] = ["Dog", "Cat", "Other"];
export const GENDER_OPTIONS: PetGender[] = ["Male", "Female"];
export const SIZE_OPTIONS: PetSize[] = ["Small", "Medium", "Large"];
export const TEMPERAMENT_OPTIONS: PetTemperament[] = [
  "Calm",
  "Playful",
  "Shy",
  "Energetic",
  "Affectionate",
  "Independent",
];
export const ENERGY_LEVEL_OPTIONS: PetEnergyLevel[] = ["Low", "Medium", "High"];
export const STATUS_OPTIONS: PetStatus[] = ["Available", "Pending", "Adopted", "Foster"];

export const EMPTY_PET_FORM: PetFormValues = {
  name: "",
  species: "",
  breed: "",
  age: "",
  gender: "",
  size: "",
  weight: "",
  temperament: "",
  energyLevel: "",
  healthStatus: "",
  description: "",
};

export function petToFormValues(pet: Pet): PetFormValues {
  return {
    name: pet.name,
    species: pet.species,
    breed: pet.breed || "",
    age: pet.age?.toString() || "",
    gender: pet.gender,
    size: pet.size || "",
    weight: pet.weight?.toString() || "",
    temperament: pet.temperament || "",
    energyLevel: pet.energyLevel || "",
    healthStatus: pet.healthStatus || "",
    description: pet.description || "",
  };
}

/**
 * Converts form state to a request payload. Empty strings on optional
 * enum fields (size/temperament/energyLevel) must be omitted entirely
 * rather than sent as "" — the backend's zod schema validates them
 * against a fixed enum list that doesn't include "", so an empty-string
 * value would fail validation instead of being treated as "not set".
 */
export function petFormToPayload(values: PetFormValues): Record<string, string | number> {
  const payload: Record<string, string | number> = {
    name: values.name,
    species: values.species,
    gender: values.gender,
  };

  if (values.breed) payload.breed = values.breed;
  if (values.age) payload.age = Number(values.age);
  if (values.size) payload.size = values.size;
  if (values.weight) payload.weight = Number(values.weight);
  if (values.temperament) payload.temperament = values.temperament;
  if (values.energyLevel) payload.energyLevel = values.energyLevel;
  if (values.healthStatus) payload.healthStatus = values.healthStatus;
  if (values.description) payload.description = values.description;

  return payload;
}
