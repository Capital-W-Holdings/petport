import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../app.js';
import { initDatabase, closeDatabase, getDb } from '../services/sqlite.js';
import type { Server } from 'http';

// Set test environment
process.env['NODE_ENV'] = 'test';
process.env['DATA_DIR'] = '/tmp/petport-test-' + Date.now();

interface ApiResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: { code: string; message: string };
}

interface TestResponse {
  status: number;
  body: ApiResponse;
  headers: Headers;
}

let server: Server;
let baseUrl: string;
let testCounter = 0;

// Generate unique email for each test
function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${++testCounter}@test.com`;
}

async function request(
  method: string,
  path: string,
  body?: object,
  token?: string
): Promise<TestResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json() as ApiResponse;
  return { status: res.status, body: data, headers: res.headers };
}

// Helper to get raw response (for binary endpoints)
async function rawRequest(
  method: string,
  path: string,
  token?: string
): Promise<{ status: number; contentType: string; buffer: ArrayBuffer }> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`${baseUrl}${path}`, { method, headers });
  return {
    status: res.status,
    contentType: res.headers.get('content-type') || '',
    buffer: await res.arrayBuffer(),
  };
}

// Helper to register and get token
async function registerAndGetToken(prefix: string): Promise<{ token: string; userId: string }> {
  const email = uniqueEmail(prefix);
  const res = await request('POST', '/api/v1/auth/register', {
    email,
    password: 'password123',
    name: 'Test User',
  });
  if (res.status !== 201) {
    throw new Error(`Registration failed: ${res.body.error?.message}`);
  }
  const data = res.body.data as Record<string, unknown>;
  const user = data?.['user'] as Record<string, unknown>;
  const tokens = data?.['tokens'] as Record<string, unknown>;
  return {
    token: tokens?.['accessToken'] as string,
    userId: user?.['id'] as string,
  };
}

// Helper to create a pet
async function createPet(token: string, name: string, species: string = 'DOG'): Promise<Record<string, unknown>> {
  const res = await request('POST', '/api/v1/pets', { name, species }, token);
  if (res.status !== 201) {
    throw new Error(`Pet creation failed: ${res.body.error?.message}`);
  }
  return res.body.data as Record<string, unknown>;
}

describe('API', () => {
  before(async () => {
    await initDatabase();
    const app = createApp();
    server = app.listen(0);
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3099;
    baseUrl = `http://localhost:${port}`;
  });

  after(() => {
    server.close();
    closeDatabase();
  });

  // ═══════════════════════════════════════════════════════════════
  // HEALTH ENDPOINTS
  // ═══════════════════════════════════════════════════════════════
  describe('Health endpoints', () => {
    it('GET /health - should return health status', async () => {
      const res = await request('GET', '/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      const data = res.body.data as Record<string, unknown>;
      assert.strictEqual(data?.['status'], 'healthy');
    });

    it('GET /health/detailed - should return detailed health', async () => {
      const res = await request('GET', '/health/detailed');
      assert.strictEqual(res.status, 200);
      const data = res.body.data as Record<string, unknown>;
      assert.strictEqual(data?.['status'], 'healthy');
      const checks = data?.['checks'] as Record<string, unknown>;
      const dbCheck = checks?.['database'] as Record<string, unknown>;
      assert.strictEqual(dbCheck?.['status'], 'healthy');
    });

    it('GET /live - should return live status', async () => {
      const res = await request('GET', '/live');
      assert.strictEqual(res.status, 200);
    });

    it('GET /ready - should return ready status', async () => {
      const res = await request('GET', '/ready');
      assert.strictEqual(res.status, 200);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // AUTH ENDPOINTS
  // ═══════════════════════════════════════════════════════════════
  describe('Auth endpoints', () => {
    it('POST /auth/register - should register a new user', async () => {
      const email = uniqueEmail('register');
      const res = await request('POST', '/api/v1/auth/register', {
        email,
        password: 'password123',
        name: 'New User',
      });
      assert.strictEqual(res.status, 201);
      const data = res.body.data as Record<string, unknown>;
      assert.ok(data?.['user']);
      assert.ok((data?.['tokens'] as Record<string, unknown>)?.['accessToken']);
    });

    it('POST /auth/register - should reject duplicate email', async () => {
      const email = uniqueEmail('dup');
      await request('POST', '/api/v1/auth/register', {
        email,
        password: 'password123',
        name: 'Test User',
      });
      const res = await request('POST', '/api/v1/auth/register', {
        email,
        password: 'password123',
        name: 'Test User 2',
      });
      assert.strictEqual(res.status, 409);
    });

    it('POST /auth/register - should reject invalid email', async () => {
      const res = await request('POST', '/api/v1/auth/register', {
        email: 'notanemail',
        password: 'password123',
        name: 'Test User',
      });
      assert.strictEqual(res.status, 400);
    });

    it('POST /auth/login - should login existing user', async () => {
      const email = uniqueEmail('login');
      await request('POST', '/api/v1/auth/register', {
        email,
        password: 'password123',
        name: 'Test User',
      });
      const res = await request('POST', '/api/v1/auth/login', {
        email,
        password: 'password123',
      });
      assert.strictEqual(res.status, 200);
    });

    it('POST /auth/login - should reject wrong password', async () => {
      const email = uniqueEmail('wrongpw');
      await request('POST', '/api/v1/auth/register', {
        email,
        password: 'password123',
        name: 'Test User',
      });
      const res = await request('POST', '/api/v1/auth/login', {
        email,
        password: 'wrongpassword',
      });
      assert.strictEqual(res.status, 401);
    });

    it('GET /auth/me - should return current user', async () => {
      const { token } = await registerAndGetToken('me');
      const res = await request('GET', '/api/v1/auth/me', undefined, token);
      assert.strictEqual(res.status, 200);
    });

    it('GET /auth/me - should reject without token', async () => {
      const res = await request('GET', '/api/v1/auth/me');
      assert.strictEqual(res.status, 401);
    });

    it('POST /auth/logout - should logout user', async () => {
      const { token } = await registerAndGetToken('logout');
      const res = await request('POST', '/api/v1/auth/logout', {}, token);
      assert.strictEqual(res.status, 200);
    });

    it('POST /auth/logout - should revoke token (blacklist)', async () => {
      const { token } = await registerAndGetToken('blacklist');
      
      // Token should work before logout
      const beforeLogout = await request('GET', '/api/v1/auth/me', undefined, token);
      assert.strictEqual(beforeLogout.status, 200);
      
      // Logout
      const logoutRes = await request('POST', '/api/v1/auth/logout', {}, token);
      assert.strictEqual(logoutRes.status, 200);
      
      // Token should be rejected after logout
      const afterLogout = await request('GET', '/api/v1/auth/me', undefined, token);
      assert.strictEqual(afterLogout.status, 401);
      assert.strictEqual(afterLogout.body.error?.code, 'AUTHENTICATION_ERROR');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PET CRUD ENDPOINTS
  // ═══════════════════════════════════════════════════════════════
  describe('Pet CRUD endpoints', () => {
    it('POST /pets - should create a pet', async () => {
      const { token } = await registerAndGetToken('petcreate');
      const res = await request('POST', '/api/v1/pets', {
        name: 'Buddy',
        species: 'DOG',
        breed: 'Golden Retriever',
      }, token);
      assert.strictEqual(res.status, 201);
      const data = res.body.data as Record<string, unknown>;
      assert.strictEqual(data?.['name'], 'Buddy');
      assert.ok((data?.['petportId'] as string)?.startsWith('PP-'));
    });

    it('POST /pets - should require auth', async () => {
      const res = await request('POST', '/api/v1/pets', { name: 'Buddy', species: 'DOG' });
      assert.strictEqual(res.status, 401);
    });

    it('GET /pets - should list user pets', async () => {
      const { token } = await registerAndGetToken('petlist');
      await createPet(token, 'Dog1', 'DOG');
      await createPet(token, 'Cat1', 'CAT');
      
      const res = await request('GET', '/api/v1/pets', undefined, token);
      assert.strictEqual(res.status, 200);
      const data = res.body.data as Record<string, unknown>;
      assert.strictEqual((data?.['pets'] as unknown[])?.length, 2);
    });

    it('GET /pets/:id - should get single pet', async () => {
      const { token } = await registerAndGetToken('petget');
      const pet = await createPet(token, 'SinglePet', 'DOG');
      
      const res = await request('GET', `/api/v1/pets/${pet['id']}`, undefined, token);
      assert.strictEqual(res.status, 200);
    });

    it('PATCH /pets/:id - should update pet', async () => {
      const { token } = await registerAndGetToken('petupdate');
      const pet = await createPet(token, 'UpdateMe', 'DOG');
      
      const res = await request('PATCH', `/api/v1/pets/${pet['id']}`, {
        name: 'UpdatedName',
        color: 'Brown',
      }, token);
      assert.strictEqual(res.status, 200);
      const data = res.body.data as Record<string, unknown>;
      assert.strictEqual(data?.['name'], 'UpdatedName');
    });

    it('DELETE /pets/:id - should soft delete pet', async () => {
      const { token } = await registerAndGetToken('petdelete');
      const pet = await createPet(token, 'DeleteMe', 'DOG');
      
      const res = await request('DELETE', `/api/v1/pets/${pet['id']}`, undefined, token);
      assert.strictEqual(res.status, 200);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // VACCINATION & COMPLIANCE ENDPOINTS
  // ═══════════════════════════════════════════════════════════════
  describe('Vaccination endpoints', () => {
    it('POST /pets/:id/vaccinations - should create vaccination', async () => {
      const { token } = await registerAndGetToken('vaxcreate');
      const pet = await createPet(token, 'VaxPet', 'DOG');
      
      const res = await request('POST', `/api/v1/pets/${pet['id']}/vaccinations`, {
        type: 'RABIES',
        name: 'Rabies 3-Year',
        administeredAt: '2024-06-01',
        expiresAt: '2027-06-01',
      }, token);
      assert.strictEqual(res.status, 201);
    });

    it('GET /pets/:id/compliance/rabies - should check compliance', async () => {
      const { token } = await registerAndGetToken('compliance');
      const pet = await createPet(token, 'CompliancePet', 'DOG');
      
      // Initially not compliant
      let res = await request('GET', `/api/v1/pets/${pet['id']}/compliance/rabies`, undefined, token);
      assert.strictEqual(res.status, 200);
      assert.strictEqual((res.body.data as Record<string, unknown>)?.['isCompliant'], false);
      
      // Add valid rabies vaccination
      await request('POST', `/api/v1/pets/${pet['id']}/vaccinations`, {
        type: 'RABIES',
        name: 'Rabies Vaccine',
        administeredAt: '2024-01-15',
        expiresAt: '2027-01-15',
      }, token);
      
      // Now compliant
      res = await request('GET', `/api/v1/pets/${pet['id']}/compliance/rabies`, undefined, token);
      assert.strictEqual((res.body.data as Record<string, unknown>)?.['isCompliant'], true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // QR CODE & PASSPORT ENDPOINTS
  // ═══════════════════════════════════════════════════════════════
  describe('QR Code and Passport endpoints', () => {
    it('GET /pets/:id/qr - should return QR data', async () => {
      const { token } = await registerAndGetToken('qrdata');
      const pet = await createPet(token, 'QRPet', 'DOG');
      
      const res = await request('GET', `/api/v1/pets/${pet['id']}/qr`, undefined, token);
      assert.strictEqual(res.status, 200);
      const data = res.body.data as Record<string, unknown>;
      assert.ok(data?.['petportId']);
    });

    it('GET /pets/:id/qr/image - should return QR image', async () => {
      const { token } = await registerAndGetToken('qrimage');
      const pet = await createPet(token, 'QRImagePet', 'DOG');
      
      const res = await request('GET', `/api/v1/pets/${pet['id']}/qr/image`, undefined, token);
      assert.strictEqual(res.status, 200);
      const data = res.body.data as Record<string, unknown>;
      assert.ok((data?.['dataUrl'] as string)?.startsWith('data:image/png'));
    });

    it('GET /pets/:id/qr/png - should return PNG file', async () => {
      const { token } = await registerAndGetToken('qrpng');
      const pet = await createPet(token, 'QRPngPet', 'DOG');
      
      const res = await rawRequest('GET', `/api/v1/pets/${pet['id']}/qr/png`, token);
      assert.strictEqual(res.status, 200);
      assert.ok(res.contentType.includes('image/png'));
    });

    it('GET /pets/:id/passport - should return PDF file', async () => {
      const { token } = await registerAndGetToken('passport');
      const pet = await createPet(token, 'PassportPet', 'DOG');
      
      const res = await rawRequest('GET', `/api/v1/pets/${pet['id']}/passport`, token);
      assert.strictEqual(res.status, 200);
      assert.ok(res.contentType.includes('application/pdf'));
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC & EXPORT ENDPOINTS
  // ═══════════════════════════════════════════════════════════════
  describe('Public and Export endpoints', () => {
    it('GET /public/verify/:petportId - should return public pet info', async () => {
      const { token } = await registerAndGetToken('publicverify');
      const pet = await createPet(token, 'PublicPet', 'DOG');
      const petportId = pet['petportId'] as string;
      
      const res = await request('GET', `/api/v1/public/verify/${petportId}`);
      assert.strictEqual(res.status, 200);
      const data = res.body.data as Record<string, unknown>;
      assert.strictEqual(data?.['petportId'], petportId);
    });

    it('GET /auth/export - should export all user data', async () => {
      const { token } = await registerAndGetToken('export');
      await createPet(token, 'ExportPet1', 'DOG');
      await createPet(token, 'ExportPet2', 'CAT');
      
      const res = await request('GET', '/api/v1/auth/export', undefined, token);
      assert.strictEqual(res.status, 200);
      const data = res.body.data as Record<string, unknown>;
      assert.ok(data?.['user']);
      assert.strictEqual((data?.['pets'] as unknown[])?.length, 2);
    });
  });
});
