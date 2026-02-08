import {
  Pet,
  User,
  HealthRecord,
  Vaccination,
  UserRole,
  generateId,
  generatePetportId,
} from '@petport/shared';
import { getDb, saveDatabase, isDbInitialized } from './sqlite.js';

// Stored user includes passwordHash
export interface StoredUser extends User {
  passwordHash: string;
}

// Helper to convert snake_case DB row to camelCase object
function rowToUser(row: Record<string, unknown>): StoredUser {
  return {
    id: row['id'] as string,
    email: row['email'] as string,
    passwordHash: row['password_hash'] as string,
    name: row['name'] as string,
    phone: row['phone'] as string | null,
    avatarUrl: row['avatar_url'] as string | null,
    isVerified: Boolean(row['is_verified']),
    role: (row['role'] as UserRole) || 'USER',
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}

function rowToPet(row: Record<string, unknown>): Pet {
  return {
    id: row['id'] as string,
    petportId: row['petport_id'] as string,
    ownerId: row['owner_id'] as string,
    name: row['name'] as string,
    species: row['species'] as Pet['species'],
    breed: row['breed'] as string | null,
    sex: (row['sex'] as Pet['sex']) || 'UNKNOWN',
    dateOfBirth: row['date_of_birth'] as string | null,
    color: row['color'] as string | null,
    weight: row['weight'] as number | null,
    microchipId: row['microchip_id'] as string | null,
    photoUrl: row['photo_url'] as string | null,
    verificationLevel: (row['verification_level'] as Pet['verificationLevel']) || 'BASIC',
    isActive: Boolean(row['is_active']),
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}

function rowToHealthRecord(row: Record<string, unknown>): HealthRecord {
  return {
    id: row['id'] as string,
    petId: row['pet_id'] as string,
    type: row['type'] as HealthRecord['type'],
    title: row['title'] as string,
    description: row['description'] as string | null,
    date: row['date'] as string,
    vetName: row['vet_name'] as string | null,
    clinicName: row['clinic_name'] as string | null,
    expiresAt: row['expires_at'] as string | null,
    documentUrl: row['document_url'] as string | null,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}

function rowToVaccination(row: Record<string, unknown>): Vaccination {
  return {
    id: row['id'] as string,
    petId: row['pet_id'] as string,
    type: row['type'] as Vaccination['type'],
    name: row['name'] as string,
    manufacturer: row['manufacturer'] as string | null,
    batchNumber: row['batch_number'] as string | null,
    administeredAt: row['administered_at'] as string,
    expiresAt: row['expires_at'] as string | null,
    vetName: row['vet_name'] as string | null,
    clinicName: row['clinic_name'] as string | null,
    documentUrl: row['document_url'] as string | null,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}

// Convert query result to array of objects
function queryToObjects<T>(
  sql: string,
  params: unknown[],
  mapper: (row: Record<string, unknown>) => T
): T[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  
  const results: T[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(mapper(row as Record<string, unknown>));
  }
  stmt.free();
  return results;
}

function queryOne<T>(
  sql: string,
  params: unknown[],
  mapper: (row: Record<string, unknown>) => T
): T | undefined {
  const results = queryToObjects(sql, params, mapper);
  return results[0];
}

// Legacy Store interface for backward compatibility
class SqliteStore<T extends { id: string }> {
  constructor(
    private tableName: string,
    private mapper: (row: Record<string, unknown>) => T,
    private idColumn = 'id'
  ) {}

  get(id: string): T | undefined {
    if (!isDbInitialized()) return undefined;
    return queryOne(
      `SELECT * FROM ${this.tableName} WHERE ${this.idColumn} = ?`,
      [id],
      this.mapper
    );
  }

  find(predicate: (item: T) => boolean): T | undefined {
    return this.all().find(predicate);
  }

  filter(predicate: (item: T) => boolean): T[] {
    return this.all().filter(predicate);
  }

  all(): T[] {
    if (!isDbInitialized()) return [];
    return queryToObjects(`SELECT * FROM ${this.tableName}`, [], this.mapper);
  }
}

// Store instances (for backward compatibility with route code)
export const userStore = new SqliteStore<StoredUser>('users', rowToUser);
export const petStore = new SqliteStore<Pet>('pets', rowToPet);
export const healthRecordStore = new SqliteStore<HealthRecord>('health_records', rowToHealthRecord);
export const vaccinationStore = new SqliteStore<Vaccination>('vaccinations', rowToVaccination);

/**
 * Get pet by ID, respecting soft-delete (only returns active pets)
 */
export function getActivePet(id: string): Pet | undefined {
  if (!isDbInitialized()) return undefined;
  return queryOne(
    'SELECT * FROM pets WHERE id = ? AND is_active = 1',
    [id],
    rowToPet
  );
}

// User functions
export function createUser(data: Omit<StoredUser, 'id' | 'createdAt' | 'updatedAt'>): StoredUser {
  const db = getDb();
  const now = new Date().toISOString();
  const id = generateId('user');
  const role = data.role || 'USER';

  db.run(
    `INSERT INTO users (id, email, password_hash, name, phone, avatar_url, is_verified, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.email, data.passwordHash, data.name, data.phone, data.avatarUrl, data.isVerified ? 1 : 0, role, now, now]
  );
  saveDatabase();

  return {
    id,
    ...data,
    role,
    createdAt: now,
    updatedAt: now,
  };
}

export function getUserByEmail(email: string): StoredUser | undefined {
  if (!isDbInitialized()) return undefined;
  return queryOne(
    'SELECT * FROM users WHERE LOWER(email) = LOWER(?)',
    [email],
    rowToUser
  );
}

export function updateUserPassword(userId: string, newPasswordHash: string): boolean {
  if (!isDbInitialized()) return false;
  const db = getDb();
  const now = new Date().toISOString();
  
  db.run(
    'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
    [newPasswordHash, now, userId]
  );
  saveDatabase();
  
  // Update in-memory store
  const user = userStore.get(userId);
  if (user) {
    user.passwordHash = newPasswordHash;
    user.updatedAt = now;
  }
  
  return true;
}

// Pet functions
export function createPet(
  ownerId: string,
  data: Omit<Pet, 'id' | 'petportId' | 'ownerId' | 'createdAt' | 'updatedAt' | 'verificationLevel' | 'isActive'>
): Pet {
  const db = getDb();
  const now = new Date().toISOString();
  const id = generateId('pet');
  
  // Generate unique petportId with collision check
  let petportId: string;
  let attempts = 0;
  const maxAttempts = 10;
  do {
    petportId = generatePetportId();
    attempts++;
    if (attempts > maxAttempts) {
      throw new Error('Failed to generate unique PetPort ID after maximum attempts');
    }
  } while (getPetByPetportId(petportId));

  db.run(
    `INSERT INTO pets (id, petport_id, owner_id, name, species, breed, sex, date_of_birth, color, weight, microchip_id, photo_url, verification_level, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      petportId,
      ownerId,
      data.name,
      data.species,
      data.breed,
      data.sex || 'UNKNOWN',
      data.dateOfBirth,
      data.color,
      data.weight,
      data.microchipId,
      data.photoUrl,
      'BASIC',
      1,
      now,
      now,
    ]
  );
  saveDatabase();

  return {
    id,
    petportId,
    ownerId,
    ...data,
    sex: data.sex || 'UNKNOWN',
    verificationLevel: 'BASIC',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function updatePet(id: string, data: Partial<Pet>): Pet | undefined {
  const db = getDb();
  const existing = getActivePet(id);
  if (!existing) return undefined;

  const now = new Date().toISOString();
  const updates: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.species !== undefined) {
    updates.push('species = ?');
    values.push(data.species);
  }
  if (data.breed !== undefined) {
    updates.push('breed = ?');
    values.push(data.breed);
  }
  if (data.sex !== undefined) {
    updates.push('sex = ?');
    values.push(data.sex);
  }
  if (data.dateOfBirth !== undefined) {
    updates.push('date_of_birth = ?');
    values.push(data.dateOfBirth);
  }
  if (data.color !== undefined) {
    updates.push('color = ?');
    values.push(data.color);
  }
  if (data.weight !== undefined) {
    updates.push('weight = ?');
    values.push(data.weight);
  }
  if (data.microchipId !== undefined) {
    updates.push('microchip_id = ?');
    values.push(data.microchipId);
  }
  if (data.photoUrl !== undefined) {
    updates.push('photo_url = ?');
    values.push(data.photoUrl);
  }
  if (data.verificationLevel !== undefined) {
    updates.push('verification_level = ?');
    values.push(data.verificationLevel);
  }
  if (data.isActive !== undefined) {
    updates.push('is_active = ?');
    values.push(data.isActive ? 1 : 0);
  }

  values.push(id);
  db.run(`UPDATE pets SET ${updates.join(', ')} WHERE id = ?`, values);
  saveDatabase();

  return petStore.get(id);
}

export function getPetsByOwner(ownerId: string): Pet[] {
  if (!isDbInitialized()) return [];
  return queryToObjects(
    'SELECT * FROM pets WHERE owner_id = ? AND is_active = 1 ORDER BY created_at DESC',
    [ownerId],
    rowToPet
  );
}

export function getPetByPetportId(petportId: string): Pet | undefined {
  if (!isDbInitialized()) return undefined;
  return queryOne(
    'SELECT * FROM pets WHERE petport_id = ? AND is_active = 1',
    [petportId],
    rowToPet
  );
}

// Health record functions
export function createHealthRecord(
  petId: string,
  data: Omit<HealthRecord, 'id' | 'petId' | 'createdAt' | 'updatedAt'>
): HealthRecord {
  const db = getDb();
  const now = new Date().toISOString();
  const id = generateId('hr');

  db.run(
    `INSERT INTO health_records (id, pet_id, type, title, description, date, vet_name, clinic_name, expires_at, document_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      petId,
      data.type,
      data.title,
      data.description,
      data.date,
      data.vetName,
      data.clinicName,
      data.expiresAt,
      data.documentUrl,
      now,
      now,
    ]
  );
  saveDatabase();

  return {
    id,
    petId,
    ...data,
    createdAt: now,
    updatedAt: now,
  };
}

export function getHealthRecordsByPet(petId: string): HealthRecord[] {
  if (!isDbInitialized()) return [];
  return queryToObjects(
    'SELECT * FROM health_records WHERE pet_id = ? ORDER BY date DESC',
    [petId],
    rowToHealthRecord
  );
}

// Vaccination functions
export function createVaccination(
  petId: string,
  data: Omit<Vaccination, 'id' | 'petId' | 'createdAt' | 'updatedAt'>
): Vaccination {
  const db = getDb();
  const now = new Date().toISOString();
  const id = generateId('vax');

  db.run(
    `INSERT INTO vaccinations (id, pet_id, type, name, manufacturer, batch_number, administered_at, expires_at, vet_name, clinic_name, document_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      petId,
      data.type,
      data.name,
      data.manufacturer,
      data.batchNumber,
      data.administeredAt,
      data.expiresAt,
      data.vetName,
      data.clinicName,
      data.documentUrl,
      now,
      now,
    ]
  );
  saveDatabase();

  return {
    id,
    petId,
    ...data,
    createdAt: now,
    updatedAt: now,
  };
}

export function getVaccinationsByPet(petId: string): Vaccination[] {
  if (!isDbInitialized()) return [];
  return queryToObjects(
    'SELECT * FROM vaccinations WHERE pet_id = ? ORDER BY administered_at DESC',
    [petId],
    rowToVaccination
  );
}

// Statistics
export function getStats(): { users: number; pets: number; vaccinations: number } {
  if (!isDbInitialized()) return { users: 0, pets: 0, vaccinations: 0 };
  const db = getDb();

  const users = db.exec('SELECT COUNT(*) as count FROM users')[0]?.values[0]?.[0] as number || 0;
  const pets = db.exec('SELECT COUNT(*) as count FROM pets WHERE is_active = 1')[0]?.values[0]?.[0] as number || 0;
  const vaccinations = db.exec('SELECT COUNT(*) as count FROM vaccinations')[0]?.values[0]?.[0] as number || 0;

  return { users, pets, vaccinations };
}

// Role management functions
export function updateUserRole(userId: string, role: UserRole): boolean {
  if (!isDbInitialized()) return false;
  const db = getDb();
  const now = new Date().toISOString();

  db.run(
    'UPDATE users SET role = ?, updated_at = ? WHERE id = ?',
    [role, now, userId]
  );
  saveDatabase();
  return true;
}

export function getUsersByRole(role: UserRole): StoredUser[] {
  if (!isDbInitialized()) return [];
  return queryToObjects(
    'SELECT * FROM users WHERE role = ?',
    [role],
    rowToUser
  );
}

export function getAllUsers(): StoredUser[] {
  if (!isDbInitialized()) return [];
  return queryToObjects(
    'SELECT * FROM users ORDER BY created_at DESC',
    [],
    rowToUser
  );
}

// Audit logging
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

function rowToAuditLog(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: row['id'] as string,
    adminUserId: row['admin_user_id'] as string,
    action: row['action'] as string,
    targetType: row['target_type'] as string,
    targetId: row['target_id'] as string | null,
    details: row['details'] as string | null,
    ipAddress: row['ip_address'] as string | null,
    userAgent: row['user_agent'] as string | null,
    createdAt: row['created_at'] as string,
  };
}

export function createAuditLog(data: Omit<AuditLogEntry, 'id' | 'createdAt'>): AuditLogEntry {
  const db = getDb();
  const now = new Date().toISOString();
  const id = generateId('audit');

  db.run(
    `INSERT INTO admin_audit_log (id, admin_user_id, action, target_type, target_id, details, ip_address, user_agent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.adminUserId, data.action, data.targetType, data.targetId, data.details, data.ipAddress, data.userAgent, now]
  );
  saveDatabase();

  return { id, ...data, createdAt: now };
}

export function getAuditLogs(limit = 100, offset = 0): AuditLogEntry[] {
  if (!isDbInitialized()) return [];
  return queryToObjects(
    'SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset],
    rowToAuditLog
  );
}

// Security metrics
export interface SecurityMetric {
  id: string;
  eventType: string;
  email: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: string | null;
  createdAt: string;
}

function rowToSecurityMetric(row: Record<string, unknown>): SecurityMetric {
  return {
    id: row['id'] as string,
    eventType: row['event_type'] as string,
    email: row['email'] as string | null,
    ipAddress: row['ip_address'] as string | null,
    userAgent: row['user_agent'] as string | null,
    details: row['details'] as string | null,
    createdAt: row['created_at'] as string,
  };
}

export function createSecurityMetric(data: Omit<SecurityMetric, 'id' | 'createdAt'>): SecurityMetric {
  const db = getDb();
  const now = new Date().toISOString();
  const id = generateId('sec');

  db.run(
    `INSERT INTO security_metrics (id, event_type, email, ip_address, user_agent, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, data.eventType, data.email, data.ipAddress, data.userAgent, data.details, now]
  );
  saveDatabase();

  return { id, ...data, createdAt: now };
}

export function getSecurityMetrics(eventType?: string, limit = 100, offset = 0): SecurityMetric[] {
  if (!isDbInitialized()) return [];

  if (eventType) {
    return queryToObjects(
      'SELECT * FROM security_metrics WHERE event_type = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [eventType, limit, offset],
      rowToSecurityMetric
    );
  }

  return queryToObjects(
    'SELECT * FROM security_metrics ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset],
    rowToSecurityMetric
  );
}

export function getSecurityMetricsCounts(hoursAgo = 24): Record<string, number> {
  if (!isDbInitialized()) return {};
  const db = getDb();

  const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
  const result = db.exec(
    `SELECT event_type, COUNT(*) as count FROM security_metrics
     WHERE created_at >= ? GROUP BY event_type`,
    [cutoff]
  );

  if (!result.length || !result[0]) return {};

  const counts: Record<string, number> = {};
  for (const row of result[0].values) {
    counts[row[0] as string] = row[1] as number;
  }
  return counts;
}
