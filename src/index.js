import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage
const users = new Map();
const pets = new Map();
const vaccinations = new Map();
const petVaccinations = new Map(); // petId -> Set of vaccinationIds

// Helper to generate PetPort ID
function generatePetPortId() {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `PP-${year}-${code}`;
}

// Auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: { message: 'No token provided' } });
  }
  
  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: { message: 'Invalid token' } });
  }
}

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'healthy', timestamp: new Date().toISOString() } });
});

// Register
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: { message: 'Missing required fields' } });
    }
    
    if (Array.from(users.values()).some(u => u.email === email)) {
      return res.status(409).json({ success: false, error: { message: 'Email already exists' } });
    }
    
    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    
    const user = {
      id: userId,
      email,
      passwordHash,
      name,
      createdAt: new Date().toISOString()
    };
    users.set(userId, user);
    
    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '24h' });
    
    res.status(201).json({
      success: true,
      data: {
        user: { id: userId, email, name },
        tokens: { accessToken: token }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Login
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = Array.from(users.values()).find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
    }
    
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
    }
    
    const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        tokens: { accessToken: token }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Get current user
app.get('/api/v1/auth/me', authMiddleware, (req, res) => {
  const user = users.get(req.user.userId);
  if (!user) {
    return res.status(404).json({ success: false, error: { message: 'User not found' } });
  }
  res.json({
    success: true,
    data: { id: user.id, email: user.email, name: user.name }
  });
});

// Create pet
app.post('/api/v1/pets', authMiddleware, (req, res) => {
  try {
    const { species, breed, name, sex, dateOfBirth, colorMarkings, weightKg, microchipId } = req.body;
    
    if (!species || !breed || !name || !sex) {
      return res.status(400).json({ success: false, error: { message: 'Missing required fields: species, breed, name, sex' } });
    }
    
    const petId = randomUUID();
    const petportId = generatePetPortId();
    
    const pet = {
      id: petId,
      petportId,
      ownerId: req.user.userId,
      species,
      breed,
      name,
      sex,
      dateOfBirth: dateOfBirth || null,
      colorMarkings: colorMarkings || '',
      weightKg: weightKg || null,
      microchipId: microchipId || null,
      status: 'ACTIVE',
      verificationLevel: 'BASIC',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    pets.set(petId, pet);
    petVaccinations.set(petId, new Set());
    
    console.log(`✅ Pet created: ${name} (${petportId})`);
    
    res.status(201).json({ success: true, data: pet });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// List pets
app.get('/api/v1/pets', authMiddleware, (req, res) => {
  const userPets = Array.from(pets.values()).filter(p => p.ownerId === req.user.userId);
  res.json({
    success: true,
    data: {
      items: userPets,
      total: userPets.length,
      page: 1,
      limit: 20
    }
  });
});

// Get pet by ID
app.get('/api/v1/pets/:petId', authMiddleware, (req, res) => {
  const pet = pets.get(req.params.petId);
  if (!pet) {
    return res.status(404).json({ success: false, error: { message: 'Pet not found' } });
  }
  if (pet.ownerId !== req.user.userId) {
    return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
  }
  res.json({ success: true, data: pet });
});

// Update pet
app.patch('/api/v1/pets/:petId', authMiddleware, (req, res) => {
  const pet = pets.get(req.params.petId);
  if (!pet) {
    return res.status(404).json({ success: false, error: { message: 'Pet not found' } });
  }
  if (pet.ownerId !== req.user.userId) {
    return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
  }
  
  const { breed, name, dateOfBirth, colorMarkings, weightKg, microchipId } = req.body;
  
  if (breed) pet.breed = breed;
  if (name) pet.name = name;
  if (dateOfBirth !== undefined) pet.dateOfBirth = dateOfBirth;
  if (colorMarkings !== undefined) pet.colorMarkings = colorMarkings;
  if (weightKg !== undefined) pet.weightKg = weightKg;
  if (microchipId !== undefined) pet.microchipId = microchipId;
  pet.updatedAt = new Date().toISOString();
  
  res.json({ success: true, data: pet });
});

// Delete pet
app.delete('/api/v1/pets/:petId', authMiddleware, (req, res) => {
  const pet = pets.get(req.params.petId);
  if (!pet) {
    return res.status(404).json({ success: false, error: { message: 'Pet not found' } });
  }
  if (pet.ownerId !== req.user.userId) {
    return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
  }
  
  pets.delete(req.params.petId);
  res.status(204).send();
});

// Add vaccination
app.post('/api/v1/pets/:petId/vaccinations', authMiddleware, (req, res) => {
  const pet = pets.get(req.params.petId);
  if (!pet) {
    return res.status(404).json({ success: false, error: { message: 'Pet not found' } });
  }
  if (pet.ownerId !== req.user.userId) {
    return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
  }
  
  const { vaccineName, vaccineType, administeredDate, expiresAt, administeredBy } = req.body;
  
  if (!vaccineName || !vaccineType || !administeredDate) {
    return res.status(400).json({ success: false, error: { message: 'Missing required fields' } });
  }
  
  const vaccinationId = randomUUID();
  const vaccination = {
    id: vaccinationId,
    petId: req.params.petId,
    vaccineName,
    vaccineType,
    administeredDate,
    expiresAt: expiresAt || null,
    administeredBy: administeredBy || null,
    isValid: true,
    createdAt: new Date().toISOString()
  };
  
  vaccinations.set(vaccinationId, vaccination);
  petVaccinations.get(req.params.petId).add(vaccinationId);
  
  console.log(`💉 Vaccination added: ${vaccineType} for ${pet.name}`);
  
  res.status(201).json({ success: true, data: vaccination });
});

// Get vaccinations
app.get('/api/v1/pets/:petId/vaccinations', authMiddleware, (req, res) => {
  const pet = pets.get(req.params.petId);
  if (!pet) {
    return res.status(404).json({ success: false, error: { message: 'Pet not found' } });
  }
  if (pet.ownerId !== req.user.userId) {
    return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
  }
  
  const vaxIds = petVaccinations.get(req.params.petId) || new Set();
  const vaxList = Array.from(vaxIds).map(id => vaccinations.get(id)).filter(Boolean);
  
  res.json({ success: true, data: vaxList });
});

// Check rabies compliance
app.get('/api/v1/pets/:petId/compliance/rabies', authMiddleware, (req, res) => {
  const pet = pets.get(req.params.petId);
  if (!pet) {
    return res.status(404).json({ success: false, error: { message: 'Pet not found' } });
  }
  if (pet.ownerId !== req.user.userId) {
    return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
  }
  
  const vaxIds = petVaccinations.get(req.params.petId) || new Set();
  const now = new Date().toISOString();
  
  const rabiesVax = Array.from(vaxIds)
    .map(id => vaccinations.get(id))
    .find(v => v && v.vaccineType === 'RABIES' && v.isValid && (!v.expiresAt || v.expiresAt > now));
  
  res.json({
    success: true,
    data: {
      petId: req.params.petId,
      hasValidRabiesVaccination: !!rabiesVax,
      vaccination: rabiesVax || null,
      checkedAt: now
    }
  });
});

// Public verification (no auth)
app.get('/api/v1/public/verify/:petportId', (req, res) => {
  const pet = Array.from(pets.values()).find(p => p.petportId === req.params.petportId);
  
  if (!pet || pet.status !== 'ACTIVE') {
    return res.status(404).json({ success: false, error: { message: 'Pet not found' } });
  }
  
  const vaxIds = petVaccinations.get(pet.id) || new Set();
  const now = new Date().toISOString();
  
  const validVaccinations = Array.from(vaxIds)
    .map(id => vaccinations.get(id))
    .filter(v => v && v.isValid && (!v.expiresAt || v.expiresAt > now))
    .map(v => ({
      vaccineType: v.vaccineType,
      administeredDate: v.administeredDate,
      expiresAt: v.expiresAt
    }));
  
  const hasValidRabies = validVaccinations.some(v => v.vaccineType === 'RABIES');
  
  res.json({
    success: true,
    data: {
      petportId: pet.petportId,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      sex: pet.sex,
      colorMarkings: pet.colorMarkings,
      verificationLevel: pet.verificationLevel,
      hasMicrochip: !!pet.microchipId,
      vaccinations: validVaccinations,
      compliance: { rabies: hasValidRabies },
      verifiedAt: now
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🐾 ═══════════════════════════════════════════════════════════
   PetPort API Server
   Running on: http://localhost:${PORT}
   Health:     http://localhost:${PORT}/health
═══════════════════════════════════════════════════════════ 🐾

Available endpoints:
  POST   /api/v1/auth/register     - Register new user
  POST   /api/v1/auth/login        - Login
  GET    /api/v1/auth/me           - Get current user
  
  GET    /api/v1/pets              - List your pets
  POST   /api/v1/pets              - Create a pet
  GET    /api/v1/pets/:id          - Get pet details
  PATCH  /api/v1/pets/:id          - Update pet
  DELETE /api/v1/pets/:id          - Delete pet
  
  GET    /api/v1/pets/:id/vaccinations     - List vaccinations
  POST   /api/v1/pets/:id/vaccinations     - Add vaccination
  GET    /api/v1/pets/:id/compliance/rabies - Check rabies status
  
  GET    /api/v1/public/verify/:petportId  - Public verification
`);
});
