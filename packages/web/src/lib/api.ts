// Use environment variable in production, relative path in development
const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, string> };
}

class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data: ApiResponse<T> = await response.json();

  if (!response.ok || !data.success) {
    throw new ApiError(
      data.error?.code ?? 'UNKNOWN_ERROR',
      data.error?.message ?? 'An error occurred',
      response.status,
      data.error?.details
    );
  }

  return data.data as T;
}

// File upload helper (doesn't use JSON content-type)
async function uploadFile<T>(
  endpoint: string,
  file: File,
  fieldName: string = 'photo'
): Promise<T> {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append(fieldName, file);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data: ApiResponse<T> = await response.json();

  if (!response.ok || !data.success) {
    throw new ApiError(
      data.error?.code ?? 'UNKNOWN_ERROR',
      data.error?.message ?? 'An error occurred',
      response.status,
      data.error?.details
    );
  }

  return data.data as T;
}

// Binary download helper
async function downloadBlob(endpoint: string, filename: string): Promise<void> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, { headers });
  
  if (!response.ok) {
    throw new ApiError('DOWNLOAD_ERROR', 'Failed to download file', response.status);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Download JSON as file
function downloadJson(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Auth
export const auth = {
  register: (email: string, password: string, name: string) =>
    request<{ user: User; tokens: { accessToken: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  login: (email: string, password: string) =>
    request<{ user: User; tokens: { accessToken: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  me: () => request<User>('/auth/me'),

  // Password reset
  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),

  // Export all user data (GDPR)
  exportData: () => request<DataExport>('/auth/export'),

  downloadExport: async () => {
    const data = await request<DataExport>('/auth/export');
    const timestamp = new Date().toISOString().split('T')[0];
    downloadJson(data, `petport-export-${timestamp}.json`);
    return data;
  },
};

// Pets
export const pets = {
  list: () => request<{ pets: Pet[]; total: number }>('/pets'),

  // Dashboard summary - single call for all pets with stats (reduces N+1)
  summary: () => request<{ pets: PetWithSummary[]; total: number }>('/pets/summary'),

  get: (id: string) => request<Pet>(`/pets/${id}`),

  create: (data: CreatePetInput) =>
    request<Pet>('/pets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreatePetInput>) =>
    request<Pet>(`/pets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request(`/pets/${id}`, { method: 'DELETE' }),

  // Photo
  uploadPhoto: (petId: string, file: File) =>
    uploadFile<{ photoUrl: string }>(`/pets/${petId}/photo`, file),

  deletePhoto: (petId: string) =>
    request(`/pets/${petId}/photo`, { method: 'DELETE' }),

  // Health records
  getHealth: (petId: string) =>
    request<{ records: HealthRecord[]; total: number }>(`/pets/${petId}/health`),

  createHealth: (petId: string, data: CreateHealthRecordInput) =>
    request<HealthRecord>(`/pets/${petId}/health`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Vaccinations
  getVaccinations: (petId: string) =>
    request<{ vaccinations: Vaccination[]; total: number }>(`/pets/${petId}/vaccinations`),

  createVaccination: (petId: string, data: CreateVaccinationInput) =>
    request<Vaccination>(`/pets/${petId}/vaccinations`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Compliance
  getRabiesCompliance: (petId: string) =>
    request<RabiesCompliance>(`/pets/${petId}/compliance/rabies`),

  // QR Code
  getQR: (petId: string) =>
    request<{ petportId: string; verifyUrl: string; qrData: string }>(`/pets/${petId}/qr`),

  getQRImage: (petId: string) =>
    request<QRCodeData>(`/pets/${petId}/qr/image`),

  downloadQRPng: (petId: string, petportId: string) =>
    downloadBlob(`/pets/${petId}/qr/png`, `${petportId}-qr.png`),

  // Passport PDF
  downloadPassport: (petId: string, petportId: string) =>
    downloadBlob(`/pets/${petId}/passport`, `${petportId}-passport.pdf`),
};

// Public
export const publicApi = {
  verify: (petportId: string) =>
    request<PublicPetInfo>(`/public/verify/${petportId}`),
};

// Types
export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// Role helper functions
export function isAdmin(user: User | null): boolean {
  return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
}

export function isSuperAdmin(user: User | null): boolean {
  return user?.role === 'SUPER_ADMIN';
}

export interface Pet {
  id: string;
  petportId: string;
  ownerId: string;
  name: string;
  species: 'DOG' | 'CAT' | 'BIRD' | 'RABBIT' | 'REPTILE' | 'OTHER';
  breed: string | null;
  sex: 'MALE' | 'FEMALE' | 'UNKNOWN';
  dateOfBirth: string | null;
  color: string | null;
  weight: number | null;
  microchipId: string | null;
  photoUrl: string | null;
  verificationLevel: 'BASIC' | 'VERIFIED' | 'CERTIFIED';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePetInput {
  name: string;
  species: Pet['species'];
  breed?: string | null;
  sex?: Pet['sex'];
  dateOfBirth?: string | null;
  color?: string | null;
  weight?: number | null;
  microchipId?: string | null;
}

export interface HealthRecord {
  id: string;
  petId: string;
  type: 'VACCINATION' | 'CHECKUP' | 'SURGERY' | 'MEDICATION' | 'LAB_RESULT' | 'OTHER';
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
  type: HealthRecord['type'];
  title: string;
  description?: string | null;
  date: string;
  vetName?: string | null;
  clinicName?: string | null;
  expiresAt?: string | null;
}

export interface Vaccination {
  id: string;
  petId: string;
  type: 'RABIES' | 'DHPP' | 'BORDETELLA' | 'LEPTOSPIROSIS' | 'LYME' | 'FVRCP' | 'FELV' | 'OTHER';
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
  type: Vaccination['type'];
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

// Summary type for dashboard (includes computed stats)
export interface PetWithSummary extends Pet {
  vaccinationCount: number;
  healthRecordCount: number;
  rabiesCompliance: RabiesCompliance;
}

export interface PublicPetInfo {
  petportId: string;
  name: string;
  species: string;
  breed: string | null;
  photoUrl: string | null;
  verificationLevel: string;
  ownerName: string;
  rabiesStatus: {
    isCompliant: boolean;
    expiresAt: string | null;
  };
}

export interface QRCodeData {
  petportId: string;
  verifyUrl: string;
  dataUrl: string;
  svg: string;
}

export interface DataExport {
  user: User;
  pets: Array<Pet & {
    healthRecords: HealthRecord[];
    vaccinations: Vaccination[];
  }>;
  exportedAt: string;
  format: string;
}

export interface HealthStats {
  status: string;
  timestamp: string;
  version: string;
  uptime?: number;
  stats?: {
    users: number;
    pets: number;
    vaccinations: number;
  };
}

// Health/Stats API (public)
export const health = {
  status: () =>
    fetch('/health')
      .then((res) => res.json())
      .then((data: { success: boolean; data: HealthStats }) => data.data),

  detailed: () =>
    fetch('/health/detailed')
      .then((res) => res.json())
      .then((data: { success: boolean; data: HealthStats }) => data.data),
};

// =====================================================
// ADMIN API TYPES
// =====================================================

export interface AuditLogEntry {
  id: string;
  adminUserId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AdminStats {
  users: number;
  pets: number;
  vaccinations: number;
  usersByRole: {
    USER: number;
    ADMIN: number;
    SUPER_ADMIN: number;
  };
}

// OWASP Compliance Types
export interface OwaspItem {
  id: string;
  name: string;
  status: 'pass' | 'partial' | 'fail' | 'not-applicable';
  description: string;
  findings: string[];
  recommendations: string[];
}

export interface ComplianceIndicator {
  standard: 'SOC2' | 'GDPR' | 'HIPAA' | 'PCI-DSS';
  status: 'compliant' | 'partial' | 'non-compliant';
  coverage: number;
  details: string;
}

export interface SecurityItem {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityCategory {
  name: string;
  score: number;
  maxScore: number;
  status: 'good' | 'warning' | 'critical';
  items: SecurityItem[];
}

export interface SecurityAudit {
  timestamp: string;
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  overallScore: number;
  owaspCompliance: OwaspItem[];
  complianceIndicators: ComplianceIndicator[];
  categories: SecurityCategory[];
}

export interface FailedLoginAttempt {
  timestamp: string;
  email: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  reason: string;
}

export interface SuspiciousActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

export interface SecurityMetrics {
  timestamp: string;
  failedLogins: {
    last24Hours: number;
    last7Days: number;
    recentAttempts: FailedLoginAttempt[];
  };
  apiErrors: {
    errorRate: number;
    totalRequests24h: number;
    errors24h: number;
    byStatusCode: Record<string, number>;
  };
  tokenUsage: {
    activeTokens: number;
    tokensIssued24h: number;
    tokensRevoked24h: number;
  };
  suspiciousActivity: SuspiciousActivityItem[];
  rateLimiting: {
    enabled: boolean;
    blockedRequests24h: number;
    topBlockedIPs: string[];
  };
}

// =====================================================
// ADMIN API
// =====================================================

export const admin = {
  // User management
  getUsers: () => request<{ users: User[]; total: number }>('/admin/users'),

  getUser: (userId: string) => request<User>(`/admin/users/${userId}`),

  updateUserRole: (userId: string, role: UserRole) =>
    request<User>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  // Statistics
  getStats: () => request<AdminStats>('/admin/stats'),

  // Audit logs
  getAuditLogs: (limit?: number, offset?: number) =>
    request<{ logs: AuditLogEntry[]; limit: number; offset: number; total: number }>(
      `/admin/audit?limit=${limit || 100}&offset=${offset || 0}`
    ),

  // Security
  getSecurityAudit: () => request<SecurityAudit>('/admin/security/audit'),

  getSecurityMetrics: () => request<SecurityMetrics>('/admin/security/metrics'),
};

export { ApiError };
