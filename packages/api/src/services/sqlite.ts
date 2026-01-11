import initSqlJs, { Database } from 'sql.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

let db: Database | null = null;
let initialized = false;

const DB_PATH = join(config.dataDir, 'petport.db');

// Schema migrations
const MIGRATIONS = [
  {
    version: 1,
    name: 'initial_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        avatar_url TEXT,
        is_verified INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pets (
        id TEXT PRIMARY KEY,
        petport_id TEXT UNIQUE NOT NULL,
        owner_id TEXT NOT NULL,
        name TEXT NOT NULL,
        species TEXT NOT NULL,
        breed TEXT,
        sex TEXT DEFAULT 'UNKNOWN',
        date_of_birth TEXT,
        color TEXT,
        weight REAL,
        microchip_id TEXT,
        photo_url TEXT,
        verification_level TEXT DEFAULT 'BASIC',
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (owner_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS health_records (
        id TEXT PRIMARY KEY,
        pet_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        vet_name TEXT,
        clinic_name TEXT,
        expires_at TEXT,
        document_url TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (pet_id) REFERENCES pets(id)
      );

      CREATE TABLE IF NOT EXISTS vaccinations (
        id TEXT PRIMARY KEY,
        pet_id TEXT NOT NULL,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        manufacturer TEXT,
        batch_number TEXT,
        administered_at TEXT NOT NULL,
        expires_at TEXT,
        vet_name TEXT,
        clinic_name TEXT,
        document_url TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (pet_id) REFERENCES pets(id)
      );

      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_pets_owner ON pets(owner_id);
      CREATE INDEX IF NOT EXISTS idx_pets_petport_id ON pets(petport_id);
      CREATE INDEX IF NOT EXISTS idx_health_records_pet ON health_records(pet_id);
      CREATE INDEX IF NOT EXISTS idx_vaccinations_pet ON vaccinations(pet_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `,
  },
];

/**
 * Initialize the database
 */
export async function initDatabase(): Promise<void> {
  if (initialized) return;

  try {
    // Ensure data directory exists
    const dataDir = dirname(DB_PATH);
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    // Initialize sql.js
    const SQL = await initSqlJs();

    // Load existing database or create new one
    if (existsSync(DB_PATH)) {
      const fileBuffer = readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
      logger.info('Loaded existing database');
    } else {
      db = new SQL.Database();
      logger.info('Created new database');
    }

    // Run migrations
    await runMigrations();

    initialized = true;
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Run pending migrations
 */
async function runMigrations(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  // Get applied migrations
  let appliedVersions: number[] = [];
  try {
    const result = db.exec('SELECT version FROM migrations');
    if (result.length > 0 && result[0]) {
      appliedVersions = result[0].values.map((row: unknown[]) => row[0] as number);
    }
  } catch {
    // migrations table doesn't exist yet, will be created
  }

  // Apply pending migrations
  for (const migration of MIGRATIONS) {
    if (!appliedVersions.includes(migration.version)) {
      logger.info(`Applying migration ${migration.version}: ${migration.name}`);
      
      // Split by semicolons and execute each statement
      const statements = migration.sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        db.run(statement);
      }

      // Record migration
      db.run(
        'INSERT INTO migrations (version, name, applied_at) VALUES (?, ?, ?)',
        [migration.version, migration.name, new Date().toISOString()]
      );

      logger.info(`Migration ${migration.version} applied successfully`);
    }
  }

  // Save after migrations
  saveDatabase();
}

/**
 * Save database to disk
 */
export function saveDatabase(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(DB_PATH, buffer);
}

/**
 * Get the database instance
 */
export function getDb(): Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

/**
 * Check if database is initialized
 */
export function isDbInitialized(): boolean {
  return initialized;
}

/**
 * Close the database
 */
export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
    initialized = false;
    logger.info('Database closed');
  }
}

// Auto-save interval (every 30 seconds)
let saveInterval: NodeJS.Timeout | null = null;

export function startAutoSave(): void {
  if (saveInterval) return;
  saveInterval = setInterval(() => {
    if (initialized) {
      saveDatabase();
    }
  }, 30000);
}

export function stopAutoSave(): void {
  if (saveInterval) {
    clearInterval(saveInterval);
    saveInterval = null;
  }
}
