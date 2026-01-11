# PETPORT SECURITY FIXES — CHANGELOG

**Date**: January 4, 2026  
**Phase**: Critical Security Remediation + Performance Optimization

---

## FIXES APPLIED

### ✅ SEC-001: JWT Secret Validation (CRITICAL → FIXED)
**File**: `packages/api/src/config/index.ts`

**Before**: Random JWT secret generated at startup  
**After**: JWT_SECRET environment variable required in production, random fallback only for dev/test

```typescript
jwtSecret: (() => {
  const secret = process.env['JWT_SECRET'];
  const env = getEnv('NODE_ENV', 'development');
  if (!secret && env === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is required in production');
  }
  return secret || randomBytes(32).toString('hex');
})(),
```

---

### ✅ SEC-002: Token Revocation (CRITICAL → FIXED)
**Files**: 
- `packages/api/src/services/tokenBlacklist.ts` (NEW)
- `packages/api/src/middleware/auth.ts`
- `packages/api/src/routes/auth.ts`

**Before**: Logout was no-op, tokens remained valid  
**After**: In-memory blacklist with TTL cleanup. Tokens invalidated on logout.

```typescript
// New blacklist service with automatic cleanup
export function blacklistToken(token: string, expiresAt: number): void;
export function isTokenBlacklisted(token: string): boolean;

// Logout now actually revokes token
router.post('/logout', authenticate, (req, res) => {
  if (req.token && req.tokenExp) {
    blacklistToken(req.token, req.tokenExp);
  }
  res.json({ success: true });
});
```

**Note**: Works for single-instance. For horizontal scaling, upgrade to Redis.

---

### ✅ SEC-003: CORS Wildcard Removed (CRITICAL → FIXED)
**File**: `packages/api/src/config/index.ts`

**Before**: CORS defaults to `*` (any origin)  
**After**: CORS_ORIGINS required in production, localhost defaults for dev only

---

### ✅ SEC-004: Magic Byte Verification (HIGH → FIXED)
**File**: `packages/api/src/services/photoService.ts`

**Before**: Only checked MIME type header  
**After**: Verifies actual file content against magic bytes (JPEG, PNG, WebP)

---

### ✅ SEC-005: Path Traversal Protection (HIGH → FIXED)
**File**: `packages/api/src/services/photoService.ts`

**Before**: No validation on filename in `deletePhoto()`  
**After**: Sanitizes filename and verifies resolved path stays within upload directory

---

### ✅ SEC-006: Email Normalization (HIGH → FIXED)
**File**: `packages/api/src/routes/auth.ts`

**Before**: Email normalized inconsistently  
**After**: Email normalized via Zod transform at validation layer

---

### ✅ SEC-010: Public Endpoint Privacy (MEDIUM → FIXED)
**File**: `packages/api/src/routes/public.ts`

**Before**: Exposes owner's full name  
**After**: Exposes first name only

---

### ✅ SEC-011: Public Endpoint Rate Limiting (LOW → FIXED)
**File**: `packages/api/src/routes/public.ts`

**Before**: No rate limiting on `/public/verify/:petportId`  
**After**: Standard rate limiter applied

---

### ✅ BUILD-002: Test Script NODE_ENV (CRITICAL → FIXED)
**File**: `packages/api/package.json`

**Before**: `node --experimental-vm-modules --test ...`  
**After**: `NODE_ENV=test node --experimental-vm-modules --test ...`

---

### ✅ LOGIC-001: Rabies Expiry Policy (HIGH → FIXED)
**Files**: `packages/api/src/routes/pets.ts`, `packages/api/src/routes/public.ts`

**Before**: Vaccinations without expiry = always valid (dangerous assumption)  
**After**: Default expiry of 1 year from administration date (veterinary standard)

```typescript
export const DEFAULT_VACCINATION_VALIDITY_DAYS = 365;

// If no expiry specified, calculate from administration date
if (!rabiesVax.expiresAt) {
  expiresAt = new Date(rabiesVax.administeredAt);
  expiresAt.setDate(expiresAt.getDate() + DEFAULT_VACCINATION_VALIDITY_DAYS);
}
```

---

### ✅ LOGIC-005: Health Records vs Vaccinations (MEDIUM → FIXED)
**File**: `packages/shared/src/constants/index.ts`

**Before**: `HEALTH_RECORD_TYPES` included `'VACCINATION'` (confusing)  
**After**: Removed `'VACCINATION'` from health record types. Vaccinations table is source of truth.

---

### ✅ SCALE-003: Dashboard N+1 Query (MEDIUM → FIXED)
**Files**:
- `packages/api/src/routes/pets.ts` - Added `/pets/summary` endpoint
- `packages/web/src/lib/api.ts` - Added `pets.summary()` 
- `packages/web/src/pages/Dashboard.tsx` - Uses summary endpoint

**Before**: Dashboard made 3N+1 API calls (1 list + 3 per pet)  
**After**: Single `/pets/summary` endpoint returns all data

```typescript
// New endpoint: GET /api/v1/pets/summary
interface PetSummary extends Pet {
  vaccinationCount: number;
  healthRecordCount: number;
  rabiesCompliance: RabiesCompliance;
}
```

---

### ✅ EDGE-002: PetportID Collision Check (HIGH → FIXED)
**File**: `packages/api/src/services/database.ts`

**Before**: No collision check on petportId  
**After**: Retries up to 10 times if collision detected

---

### ✅ EDGE-003: Weight Validation (HIGH → FIXED)
**File**: `packages/api/src/routes/pets.ts`

**Before**: `.positive()` (rejects zero)  
**After**: `.min(0).max(1000)` (allows zero, upper bound)

---

### ✅ EDGE-004: Pet Name Whitespace (MEDIUM → FIXED)
**File**: `packages/api/src/routes/pets.ts`

**Before**: `z.string().min(1)` allows whitespace-only  
**After**: `z.string().trim().min(1)` rejects whitespace-only

---

### ✅ EDGE-006: Max Pets Per User (MEDIUM → FIXED)
**File**: `packages/api/src/routes/pets.ts`

**Before**: Unlimited pets per user  
**After**: Maximum 50 pets per account

---

## TEST RESULTS

| Package | Tests | Status |
|---------|-------|--------|
| `@petport/shared` | 20 | ✅ All passing |
| `@petport/api` | 27 | ✅ All passing |
| **Total** | **47** | ✅ |

New test added: `POST /auth/logout - should revoke token (blacklist)`

---

## ADDITIONAL FIXES (Phase 7)

### ✅ LOGIC-002: Soft Delete Consistency (HIGH → FIXED)
**Files**: `packages/api/src/services/database.ts`, `packages/api/src/routes/pets.ts`

**Before**: `petStore.get()` returned soft-deleted pets  
**After**: Added `getActivePet()` function that only returns active pets. `verifyPetOwnership` and `updatePet` now use this function.

---

### ✅ UX-003: Replace alert() with Toast (MEDIUM → FIXED)
**File**: `packages/web/src/pages/PetDetail.tsx`

**Before**: Used native `alert()` for errors  
**After**: Uses `toast.error()` and `toast.success()` for consistent UX

---

### ✅ EDGE-001: Duplicate Pet Names (HIGH → FIXED)
**File**: `packages/api/src/routes/pets.ts`

**Before**: Only checked on create  
**After**: Also checks on update when name is changed

---

### ✅ LOGIC-004: Species Emoji (MEDIUM → ALREADY FIXED)
**File**: `packages/web/src/lib/utils.ts`

Already had complete mapping for all species including RABBIT, REPTILE, OTHER.

---

## REMAINING ISSUES

### Deferred (Require Infrastructure)

| Issue | Severity | Reason Deferred |
|-------|----------|-----------------|
| SEC-007: Multer upgrade | 🟠 High | Breaking changes in v2 API |
| SCALE-001: Rate limiter Redis | 🟠 High | Requires Redis infrastructure |
| SCALE-002: PostgreSQL migration | 🟠 High | Major refactor |
| SCALE-004: Async PDF Generation | 🟡 Medium | Requires job queue (Bull) |
| BUILD-003: Vite/ESBuild CVE | 🟡 Moderate | Dev-only, fix requires Vite 7 breaking change |

### Deferred (UX Improvements)

| Issue | Severity | Notes |
|-------|----------|-------|
| UX-001: Password Reset Flow | 🟡 Medium | Requires email service integration |
| UX-002: Real-time Form Validation | 🟡 Low | Nice-to-have, current submit validation works |

### Upgrade Path for Token Blacklist

Current implementation uses in-memory Map. For production with multiple instances:

```typescript
// Replace tokenBlacklist.ts with Redis implementation
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

export async function blacklistToken(token: string, expiresAt: number): Promise<void> {
  const ttl = Math.ceil((expiresAt - Date.now()) / 1000);
  if (ttl > 0) {
    await redis.setex(`blacklist:${token}`, ttl, '1');
  }
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  return (await redis.exists(`blacklist:${token}`)) === 1;
}
```

---

## DEPLOYMENT CHECKLIST

Before deploying to production, ensure:

```bash
# Required environment variables
export JWT_SECRET="$(openssl rand -hex 32)"
export CORS_ORIGINS="https://petport.app,https://www.petport.app"
export NODE_ENV="production"

# Recommended
export BCRYPT_ROUNDS="12"
export JWT_EXPIRY="7d"
```

---

## FILES MODIFIED/ADDED

```
packages/shared/src/constants/index.ts    # DEFAULT_VACCINATION_VALIDITY_DAYS, removed VACCINATION from health types
packages/api/src/config/index.ts          # JWT + CORS validation
packages/api/src/routes/auth.ts           # Email normalization, logout blacklist
packages/api/src/routes/pets.ts           # Validation, max pets, magic bytes, summary endpoint
packages/api/src/routes/public.ts         # Rate limit, privacy, default rabies expiry
packages/api/src/services/database.ts     # PetportID collision check
packages/api/src/services/photoService.ts # Path traversal, magic bytes
packages/api/src/services/tokenBlacklist.ts # NEW: Token revocation service
packages/api/src/middleware/auth.ts       # Blacklist check
packages/api/src/__tests__/api.test.ts    # New blacklist test
packages/api/package.json                 # Test script NODE_ENV
packages/web/src/lib/api.ts               # pets.summary(), PetWithSummary type
packages/web/src/pages/Dashboard.tsx      # Uses summary endpoint
```
