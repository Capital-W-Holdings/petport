export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const SPECIES = ['DOG', 'CAT', 'BIRD', 'RABBIT', 'REPTILE', 'OTHER'] as const;
export const SEX = ['MALE', 'FEMALE', 'UNKNOWN'] as const;
export const VERIFICATION_LEVELS = ['BASIC', 'VERIFIED', 'CERTIFIED'] as const;

// Health records are for non-vaccination medical events. Use Vaccinations table for vaccines.
export const HEALTH_RECORD_TYPES = ['CHECKUP', 'SURGERY', 'MEDICATION', 'LAB_RESULT', 'OTHER'] as const;
export const VACCINATION_TYPES = ['RABIES', 'DHPP', 'BORDETELLA', 'LEPTOSPIROSIS', 'LYME', 'FVRCP', 'FELV', 'OTHER'] as const;

// Default expiry for vaccinations without explicit expiry date (veterinary standard: 1 year)
export const DEFAULT_VACCINATION_VALIDITY_DAYS = 365;

export const JWT_EXPIRY = '7d';
export const BCRYPT_ROUNDS = 12;

export const RATE_LIMITS = {
  STANDARD: { windowMs: 60000, max: 100 },
  AUTH: { windowMs: 60000, max: 10 },
  UPLOAD: { windowMs: 60000, max: 20 },
} as const;

export const MAX_NAME_LENGTH = 100;
export const MAX_BREED_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 2000;
export const MAX_PETS_PER_USER = 50;
export const MAX_PHOTOS_PER_PET = 20;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;
