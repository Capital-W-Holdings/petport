export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PetListResponse {
  pets: import('./pet.js').Pet[];
  total: number;
}

export interface HealthRecordListResponse {
  records: import('./pet.js').HealthRecord[];
  total: number;
}

export interface VaccinationListResponse {
  vaccinations: import('./pet.js').Vaccination[];
  total: number;
}
