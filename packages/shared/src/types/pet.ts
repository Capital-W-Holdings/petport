export type Species = 'DOG' | 'CAT' | 'BIRD' | 'RABBIT' | 'REPTILE' | 'OTHER';
export type Sex = 'MALE' | 'FEMALE' | 'UNKNOWN';
export type VerificationLevel = 'BASIC' | 'VERIFIED' | 'CERTIFIED';

export interface Pet {
  id: string;
  petportId: string;
  ownerId: string;
  name: string;
  species: Species;
  breed: string | null;
  sex: Sex;
  dateOfBirth: string | null;
  color: string | null;
  weight: number | null;
  microchipId: string | null;
  photoUrl: string | null;
  verificationLevel: VerificationLevel;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePetInput {
  name: string;
  species: Species;
  breed?: string | null;
  sex?: Sex;
  dateOfBirth?: string | null;
  color?: string | null;
  weight?: number | null;
  microchipId?: string | null;
}

export interface UpdatePetInput {
  name?: string;
  species?: Species;
  breed?: string | null;
  sex?: Sex;
  dateOfBirth?: string | null;
  color?: string | null;
  weight?: number | null;
  microchipId?: string | null;
}

export type HealthRecordType = 'VACCINATION' | 'CHECKUP' | 'SURGERY' | 'MEDICATION' | 'LAB_RESULT' | 'OTHER';

export interface HealthRecord {
  id: string;
  petId: string;
  type: HealthRecordType;
  title: string;
  description: string | null;
  date: string;
  vetName: string | null;
  clinicName: string | null;
  expiresAt: string | null;
  documentUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHealthRecordInput {
  type: HealthRecordType;
  title: string;
  description?: string | null;
  date: string;
  vetName?: string | null;
  clinicName?: string | null;
  expiresAt?: string | null;
}

export type VaccinationType = 'RABIES' | 'DHPP' | 'BORDETELLA' | 'LEPTOSPIROSIS' | 'LYME' | 'FVRCP' | 'FELV' | 'OTHER';

export interface Vaccination {
  id: string;
  petId: string;
  type: VaccinationType;
  name: string;
  manufacturer: string | null;
  batchNumber: string | null;
  administeredAt: string;
  expiresAt: string | null;
  vetName: string | null;
  clinicName: string | null;
  documentUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVaccinationInput {
  type: VaccinationType;
  name: string;
  manufacturer?: string | null;
  batchNumber?: string | null;
  administeredAt: string;
  expiresAt?: string | null;
  vetName?: string | null;
  clinicName?: string | null;
}

export interface RabiesCompliance {
  isCompliant: boolean;
  vaccination: Vaccination | null;
  expiresAt: string | null;
  daysUntilExpiry: number | null;
  message: string;
}
