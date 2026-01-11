# 🔴 PETPORT QA AUDIT REPORT
## Senior Engineer Review — Phase 5 Handoff

**Date**: January 4, 2026  
**Reviewer**: QA Engineering  
**Verdict**: ❌ **NOT READY FOR PRODUCTION**

---

## EXECUTIVE SUMMARY

| Category | Issues Found | Severity |
|----------|-------------|----------|
| **Security Flaws** | 11 | 🔴 Critical: 3, High: 5, Medium: 3 |
| **Scaling Bottlenecks** | 4 | 🟠 High: 2, Medium: 2 |
| **UX Failures** | 3 | 🟡 Medium: 3 |
| **Ambiguous Logic** | 5 | 🟠 High: 2, Medium: 3 |
| **Hidden Edge Cases** | 6 | 🟠 High: 3, Medium: 3 |
| **Build/Test Issues** | 3 | 🔴 Critical: 2, High: 1 |

---

## 🔴 CRITICAL SECURITY FLAWS

### SEC-001: JWT Secret Generation at Runtime (CRITICAL)
**File**: `packages/api/src/config/index.ts:38`
```typescript
jwtSecret: getEnv('JWT_SECRET', randomBytes(32).toString('hex')),
```
**Problem**: JWT secret is randomly generated if not set via environment variable.
- All user sessions invalidated on server restart
- Multi-instance deployments will have different secrets (tokens won't work across instances)
- Impossible to pre-sign tokens or verify tokens issued by other instances

**Fix**:
```typescript
jwtSecret: getEnv('JWT_SECRET'), // Remove default, require explicit config
```
Add startup validation:
```typescript
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required');
}
```

---

### SEC-002: Token Revocation Impossible (CRITICAL)
**File**: `packages/api/src/routes/auth.ts:103-105`
```typescript
router.post('/logout', authenticate, (_req: Request, res: Response<ApiResponse>) => {
  res.json({ success: true, data: { message: 'Logged out successfully' } });
});
```
**Problem**: Logout is a no-op. Tokens remain valid for 7 days after "logout".
- Stolen tokens cannot be invalidated
- No blacklist, no token versioning, no session tracking

**Fix**: Implement token blacklist or short-lived tokens + refresh tokens:
```typescript
// Option A: Token blacklist (Redis)
const blacklistedTokens = new Set<string>();
router.post('/logout', authenticate, (req, res) => {
  blacklistedTokens.add(req.token!);
  res.json({ success: true });
});

// Check in authenticate middleware
if (blacklistedTokens.has(token)) {
  throw new AuthenticationError('Token revoked');
}
```

---

### SEC-003: CORS Wildcard Default (CRITICAL)
**File**: `packages/api/src/config/index.ts:45`
```typescript
corsOrigins: getEnv('CORS_ORIGINS', '*').split(','),
```
**Problem**: CORS allows any origin by default. Credentials can be sent from any malicious site.

**Fix**:
```typescript
corsOrigins: getEnv('CORS_ORIGINS', 'http://localhost:5173').split(','),
// In production, require explicit CORS origins with no wildcard
```

---

### SEC-004: File Upload MIME Type Bypass (HIGH)
**File**: `packages/api/src/services/photoService.ts:31-37`
```typescript
const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
```
**Problem**: Only checks declared MIME type header, not actual file content. Attackers can upload malicious files with spoofed Content-Type.

**Fix**: Add magic byte verification:
```typescript
import { fileTypeFromBuffer } from 'file-type';

// After upload, verify actual file type
const buffer = await fs.promises.readFile(filepath);
const type = await fileTypeFromBuffer(buffer);
if (!type || !ALLOWED_TYPES.includes(type.mime)) {
  await fs.promises.unlink(filepath);
  throw new ValidationError('Invalid file type');
}
```

---

### SEC-005: Path Traversal Risk in Photo Deletion (HIGH)
**File**: `packages/api/src/services/photoService.ts:62-73`
```typescript
export function deletePhoto(filename: string): boolean {
  const filePath = join(uploadDir, filename);
```
**Problem**: If `filename` contains `../`, could delete files outside upload directory.

**Fix**:
```typescript
export function deletePhoto(filename: string): boolean {
  // Sanitize: only allow alphanumeric, dash, underscore, dot
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '');
  if (sanitized !== filename || filename.includes('..')) {
    return false;
  }
  const filePath = join(uploadDir, sanitized);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(uploadDir))) {
    return false; // Path traversal attempt
  }
  // ...rest of deletion logic
}
```

---

### SEC-006: Email Case Sensitivity Timing Attack (HIGH)
**File**: `packages/api/src/routes/auth.ts:45`
```typescript
const existing = getUserByEmail(email);
// ...
email: email.toLowerCase(), // Normalized only on create
```
**Problem**: Lookup uses original case, creation normalizes. Attacker can infer user existence via timing differences.

**Fix**: Normalize email at entry point:
```typescript
router.post('/register', authLimiter, validate(registerSchema), asyncHandler(async (req, res) => {
  const email = req.body.email.toLowerCase().trim();
  // Use normalized email throughout
}));
```

---

### SEC-007: Vulnerable Multer Version (HIGH)
**Dependency**: `multer@1.4.5-lts.2`
```
npm warn deprecated multer@1.4.5-lts.2: Multer 1.x is impacted by vulnerabilities
```
**Fix**:
```bash
npm install multer@2 --save
```
Update import syntax for breaking changes.

---

### SEC-008: 7-Day Token Expiry Too Long (MEDIUM)
**File**: `packages/api/src/config/index.ts:39`
```typescript
jwtExpiry: getEnv('JWT_EXPIRY', '7d'),
```
**Problem**: Tokens valid for 7 days without refresh mechanism.

**Fix**: Short-lived access + long-lived refresh:
```typescript
accessTokenExpiry: '15m',
refreshTokenExpiry: '7d',
```

---

### SEC-009: Email Verification Not Enforced (MEDIUM)
**File**: `packages/api/src/routes/auth.ts:57`
```typescript
isVerified: false,
```
**Problem**: `isVerified` is set to false but never checked or enforced.

**Fix**: Either implement email verification flow or remove the misleading field.

---

### SEC-010: Public Endpoint Leaks Owner Name (MEDIUM)
**File**: `packages/api/src/routes/public.ts:55`
```typescript
ownerName: owner?.name ?? 'Unknown',
```
**Problem**: Public verification leaks owner's full name — privacy concern.

**Fix**: Expose initials or first name only:
```typescript
ownerName: owner?.name?.split(' ')[0] ?? 'Unknown', // First name only
```

---

### SEC-011: No Rate Limiting on Public Verify Endpoint (LOW)
**File**: `packages/api/src/routes/public.ts`
**Problem**: `/public/verify/:petportId` has no rate limiting — enumeration attack possible.

**Fix**: Add rate limiter to public routes.

---

## 🟠 SCALING BOTTLENECKS

### SCALE-001: In-Memory Rate Limiter (HIGH)
**File**: `packages/api/src/middleware/rateLimiter.ts`
**Problem**: Uses default memory store. Won't work with multiple server instances.

**Fix**: Use Redis store:
```typescript
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redisClient = new Redis(process.env.REDIS_URL);

export const authLimiter = rateLimit({
  store: new RedisStore({ sendCommand: (...args) => redisClient.call(...args) }),
  // ...rest
});
```

---

### SCALE-002: SQLite for Production (HIGH)
**File**: `packages/api/src/services/sqlite.ts`
**Problem**: SQLite is single-writer, file-based. Not suitable for horizontal scaling.

**Fix**: Migrate to PostgreSQL for production:
```typescript
// Use node-postgres or Prisma for production
// Keep SQLite for development/testing only
```

---

### SCALE-003: Dashboard N+1 Query Pattern (MEDIUM)
**File**: `packages/web/src/pages/Dashboard.tsx:32-46`
```typescript
const petsWithStats = await Promise.all(
  data.pets.map(async (pet) => {
    const [vaxData, healthData, compliance] = await Promise.all([
      pets.getVaccinations(pet.id),
      pets.getHealth(pet.id),
      pets.getRabiesCompliance(pet.id),
    ]);
```
**Problem**: 3 API calls per pet. 10 pets = 31 HTTP requests.

**Fix**: Add batch endpoint `/api/v1/pets/summary`:
```typescript
router.get('/summary', authenticate, async (req, res) => {
  const pets = getPetsByOwner(req.user!.id);
  const summary = pets.map(pet => ({
    ...pet,
    vaccinations: getVaccinationsByPet(pet.id),
    healthRecords: getHealthRecordsByPet(pet.id),
    rabiesCompliance: calculateRabiesCompliance(pet.id),
  }));
  res.json({ success: true, data: summary });
});
```

---

### SCALE-004: Synchronous PDF Generation (MEDIUM)
**File**: `packages/api/src/routes/pets.ts:367-386`
**Problem**: PDF generation blocks the event loop. Under load, this will cause timeouts.

**Fix**: Queue PDF generation:
```typescript
// Use Bull queue
import Queue from 'bull';
const pdfQueue = new Queue('pdf-generation');

router.get('/:petId/passport', authenticate, async (req, res) => {
  const job = await pdfQueue.add({ petId: req.params.petId, userId: req.user!.id });
  res.json({ success: true, data: { jobId: job.id, status: 'processing' } });
});

// Separate endpoint to check status / download
router.get('/:petId/passport/:jobId', authenticate, async (req, res) => {
  // Return completed PDF or status
});
```

---

## 🟡 UX FAILURES

### UX-001: No Password Reset Flow
**Problem**: Users cannot recover accounts if they forget passwords.

**Fix**: Implement `/auth/forgot-password` and `/auth/reset-password` endpoints with email token verification.

---

### UX-002: No Form Validation Feedback Until Submit
**File**: `packages/web/src/pages/Register.tsx`
**Problem**: Users only see validation errors after form submission.

**Fix**: Add real-time field validation:
```tsx
const [errors, setErrors] = useState<Record<string, string>>({});

const validateEmail = (value: string) => {
  if (!value.includes('@')) {
    setErrors(prev => ({ ...prev, email: 'Invalid email' }));
  } else {
    setErrors(prev => { const { email, ...rest } = prev; return rest; });
  }
};

<Input
  error={errors.email}
  onChange={(e) => { setEmail(e.target.value); validateEmail(e.target.value); }}
/>
```

---

### UX-003: Export Uses `alert()` for Errors
**File**: `packages/web/src/pages/Dashboard.tsx:61-62`
```typescript
} catch {
  alert('Failed to export data');
}
```
**Problem**: Native `alert()` is jarring and provides no context.

**Fix**: Use toast notification system:
```typescript
import { toast } from '@/components/ui';

} catch (err) {
  toast.error('Export failed. Please try again.');
}
```

---

## 🔶 AMBIGUOUS LOGIC

### LOGIC-001: Rabies Compliance Without Expiry Date (HIGH)
**File**: `packages/api/src/routes/pets.ts:300-302`
```typescript
const expiresAt = rabiesVax.expiresAt ? new Date(rabiesVax.expiresAt) : null;
const isExpired = expiresAt ? expiresAt < now : false;
```
**Problem**: Vaccination without expiry date is considered "never expires" — is this correct?

**Decision Required**: Should no-expiry vaccinations:
- Be considered always valid? (current behavior)
- Be considered expired after 1 year?
- Require expiry date as mandatory?

---

### LOGIC-002: Soft Delete Not Consistently Enforced (HIGH)
**File**: `packages/api/src/services/database.ts:290-296`
```typescript
'SELECT * FROM pets WHERE owner_id = ? AND is_active = 1'
```
**Problem**: Only `getPetsByOwner` filters by `is_active`. Direct `petStore.get()` returns soft-deleted pets.

**Fix**: Make store respect soft-delete:
```typescript
class SqliteStore<T extends { id: string; isActive?: boolean }> {
  get(id: string): T | undefined {
    const item = queryOne(...);
    if (item && 'isActive' in item && !item.isActive) return undefined;
    return item;
  }
}
```

---

### LOGIC-003: Date Parsing Without Timezone (MEDIUM)
**File**: Multiple locations
```typescript
const now = new Date();
const expiresAt = new Date(rabiesVax.expiresAt);
```
**Problem**: `new Date()` uses local timezone. If client is in different timezone, compliance check may be wrong.

**Fix**: Use UTC consistently:
```typescript
import { parseISO, isAfter } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';

const now = new Date();
const expiresAt = parseISO(rabiesVax.expiresAt); // ISO 8601 in UTC
const isExpired = isAfter(now, expiresAt);
```

---

### LOGIC-004: Pet Species Emoji Incomplete (MEDIUM)
**File**: `packages/web/src/pages/Dashboard.tsx:205`
```typescript
{pet.species === 'DOG' ? '🐕' : pet.species === 'CAT' ? '🐈' : pet.species === 'BIRD' ? '🐦' : '🐾'}
```
**Problem**: RABBIT, REPTILE, OTHER not handled explicitly.

**Fix**:
```typescript
const SPECIES_EMOJI: Record<Pet['species'], string> = {
  DOG: '🐕', CAT: '🐈', BIRD: '🐦', RABBIT: '🐰', REPTILE: '🦎', OTHER: '🐾'
};
// Use: {SPECIES_EMOJI[pet.species]}
```

---

### LOGIC-005: Health Records vs Vaccinations Redundancy (MEDIUM)
**Problem**: `HealthRecord.type` includes `'VACCINATION'` but there's a separate `Vaccination` table. Which should be used for vaccination tracking?

**Decision Required**: Define clear data model:
- Option A: Vaccinations only in `vaccinations` table
- Option B: Merge into single `health_records` table with type discrimination

---

## 🔶 HIDDEN EDGE CASES

### EDGE-001: Duplicate Pet Names Allowed (HIGH)
**Problem**: User can create multiple pets with identical names. No unique constraint.

**Fix**: Add validation or unique constraint (per user):
```typescript
const existing = getPetsByOwner(ownerId).find(p => p.name.toLowerCase() === data.name.toLowerCase());
if (existing) throw new ConflictError('You already have a pet named ' + data.name);
```

---

### EDGE-002: PetPort ID Collision Theoretical (HIGH)
**File**: `packages/shared/src/utils/index.ts`
**Problem**: `generatePetportId()` uses 8 random alphanumeric chars (36^8 ≈ 2.8 trillion combinations). No collision check.

**Fix**: Add uniqueness verification:
```typescript
export function createPet(...) {
  let petportId: string;
  let attempts = 0;
  do {
    petportId = generatePetportId();
    attempts++;
    if (attempts > 10) throw new Error('PetportId generation failed');
  } while (getPetByPetportId(petportId));
  // ...
}
```

---

### EDGE-003: Weight Field Allows Negative Numbers (HIGH)
**File**: `packages/api/src/routes/pets.ts:55`
```typescript
weight: z.number().positive().optional().nullable(),
```
**Problem**: `.positive()` rejects zero, which might be valid for unweighed pets. Also, no upper bound.

**Fix**:
```typescript
weight: z.number().min(0).max(1000).optional().nullable(), // 0-1000kg reasonable range
```

---

### EDGE-004: Empty Pet Name Passes Validation (MEDIUM)
**File**: `packages/api/src/routes/pets.ts:49`
```typescript
name: z.string().min(1).max(100),
```
**Problem**: `"   "` (whitespace only) passes `.min(1)`.

**Fix**:
```typescript
name: z.string().trim().min(1).max(100),
```

---

### EDGE-005: Photo URL Not Validated on Fetch (MEDIUM)
**Problem**: If photo is deleted from disk but URL remains in database, API will serve 404.

**Fix**: Add existence check in photo endpoints, or cleanup job for orphaned records.

---

### EDGE-006: Max Pets Per User Unlimited (MEDIUM)
**Problem**: User could create millions of pets, causing storage and query issues.

**Fix**: Add limit:
```typescript
const MAX_PETS_PER_USER = 100;
const existing = getPetsByOwner(ownerId);
if (existing.length >= MAX_PETS_PER_USER) {
  throw new ValidationError(`Maximum ${MAX_PETS_PER_USER} pets allowed`);
}
```

---

## 🔴 BUILD/TEST ISSUES

### BUILD-001: Tarball Contains Corrupted Build Output (CRITICAL)
**Problem**: Distributed tarball had `.d.ts.map` files but missing actual `.d.ts` files. Required full rebuild.

**Fix**: Fix build script to run `tsc -b --clean` before packaging:
```json
{
  "scripts": {
    "prebuild": "npm run clean",
    "clean": "rm -rf packages/*/dist packages/*/tsconfig.tsbuildinfo",
    "build": "tsc -b packages/shared packages/api && cd packages/web && npm run build"
  }
}
```

---

### BUILD-002: Test Script Missing NODE_ENV (CRITICAL)
**File**: `packages/api/package.json`
```json
"test": "node --experimental-vm-modules --test dist/__tests__/*.test.js"
```
**Problem**: Tests run in development mode, causing rate limit failures (13/26 tests fail).

**Fix**:
```json
"test": "NODE_ENV=test node --experimental-vm-modules --test dist/__tests__/*.test.js"
```

---

### BUILD-003: Vite/ESBuild Security Vulnerabilities (HIGH)
```
2 moderate severity vulnerabilities
esbuild  <=0.24.2 - Enables any website to send requests to dev server
```
**Fix**:
```bash
npm audit fix --force
# Or pin to patched versions
```

---

## REQUIRED ACTIONS BEFORE PRODUCTION

### Immediate (Block Deployment)
1. [ ] Set required JWT_SECRET environment variable with validation
2. [ ] Implement token blacklist or refresh token flow
3. [ ] Fix CORS to whitelist specific origins only
4. [ ] Add magic byte validation for file uploads
5. [ ] Fix test script to set NODE_ENV=test
6. [ ] Upgrade multer to v2
7. [ ] Run npm audit fix

### Before Beta
8. [ ] Implement password reset flow
9. [ ] Add Redis-backed rate limiter
10. [ ] Add batch pets summary endpoint
11. [ ] Define clear vaccination expiry policy
12. [ ] Add pet uniqueness validation
13. [ ] Add PetportID collision check

### Before GA
14. [ ] Migrate to PostgreSQL
15. [ ] Queue PDF generation
16. [ ] Implement email verification
17. [ ] Add proper toast notifications
18. [ ] Add max pets per user limit

---

## CHECKPOINT SUMMARY

**What's Done**:
- ✅ All packages now compile with TypeScript strict mode
- ✅ All 46 tests pass (with NODE_ENV=test)
- ✅ All API endpoints have basic error handling
- ✅ All frontend components have loading/error states
- ✅ Security audit complete

**What's Next**:
- Fix 7 critical/high security issues before any deployment
- Address scaling bottlenecks before load testing
- Resolve ambiguous logic decisions with product team

**Blocked Decisions Requiring Input**:
1. Rabies vaccination without expiry date — valid forever or require expiry?
2. Health Records vs Vaccinations table — which is source of truth?
3. Privacy policy — should owner name be exposed on public verify?
4. User limits — max pets per user?

---

*Report generated by Senior QA Engineering*
