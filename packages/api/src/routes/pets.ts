import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import {
  ApiResponse,
  Pet,
  HealthRecord,
  Vaccination,
  RabiesCompliance,
  PetListResponse,
  HealthRecordListResponse,
  VaccinationListResponse,
  NotFoundError,
  AuthorizationError,
  ValidationError,
  SPECIES,
  SEX,
  HEALTH_RECORD_TYPES,
  VACCINATION_TYPES,
  DEFAULT_VACCINATION_VALIDITY_DAYS,
  daysBetween,
} from '@petport/shared';
import { authenticate } from '../middleware/auth.js';
import { validate, petIdParamSchema } from '../middleware/validation.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import {
  petStore,
  createPet,
  updatePet,
  getPetsByOwner,
  getHealthRecordsByPet,
  getVaccinationsByPet,
  getActivePet,
  createHealthRecord,
  createVaccination,
  userStore,
} from '../services/database.js';
import { generateQRCode, generateQRCodeBuffer } from '../services/qrService.js';
import { generatePassportPDF } from '../services/pdfService.js';
import { uploadSingle, getPhotoUrl, deletePhoto, getFilenameFromUrl, verifyFileMagicBytes } from '../services/photoService.js';

const router = Router();

// Async handler wrapper for proper error forwarding
type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
const asyncHandler = (fn: AsyncHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Schemas
const createPetSchema = z.object({
  name: z.string().trim().min(1, 'Pet name is required').max(100),
  species: z.enum(SPECIES),
  breed: z.string().max(100).optional().nullable(),
  sex: z.enum(SEX).optional().default('UNKNOWN'),
  dateOfBirth: z.string().optional().nullable(),
  color: z.string().max(50).optional().nullable(),
  weight: z.number().min(0, 'Weight cannot be negative').max(1000, 'Weight exceeds maximum').optional().nullable(),
  microchipId: z.string().max(50).optional().nullable(),
});

const updatePetSchema = createPetSchema.partial();

const createHealthRecordSchema = z.object({
  type: z.enum(HEALTH_RECORD_TYPES),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  date: z.string(),
  vetName: z.string().max(100).optional().nullable(),
  clinicName: z.string().max(200).optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

const createVaccinationSchema = z.object({
  type: z.enum(VACCINATION_TYPES),
  name: z.string().min(1).max(200),
  manufacturer: z.string().max(200).optional().nullable(),
  batchNumber: z.string().max(100).optional().nullable(),
  administeredAt: z.string(),
  expiresAt: z.string().optional().nullable(),
  vetName: z.string().max(100).optional().nullable(),
  clinicName: z.string().max(200).optional().nullable(),
});

// Helper to verify pet ownership
function verifyPetOwnership(petId: string, userId: string): Pet {
  const pet = getActivePet(petId);
  if (!pet) {
    throw new NotFoundError('Pet', petId);
  }
  if (pet.ownerId !== userId) {
    throw new AuthorizationError('You do not own this pet');
  }
  return pet;
}

// Pet CRUD
router.get('/', authenticate, (req: Request, res: Response<ApiResponse<PetListResponse>>) => {
  const pets = getPetsByOwner(req.user!.id);
  res.json({ success: true, data: { pets, total: pets.length } });
});

// Dashboard summary - all pets with stats in single call (prevents N+1)
interface PetSummary extends Pet {
  vaccinationCount: number;
  healthRecordCount: number;
  rabiesCompliance: RabiesCompliance;
}

router.get('/summary', authenticate, (req: Request, res: Response<ApiResponse<{ pets: PetSummary[]; total: number }>>) => {
  const pets = getPetsByOwner(req.user!.id);
  const now = new Date();
  
  const summaries: PetSummary[] = pets.map(pet => {
    const vaccinations = getVaccinationsByPet(pet.id);
    const healthRecords = getHealthRecordsByPet(pet.id);
    
    // Calculate rabies compliance
    const rabiesVax = vaccinations
      .filter(v => v.type === 'RABIES')
      .sort((a, b) => new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime())[0];
    
    let rabiesCompliance: RabiesCompliance;
    if (!rabiesVax) {
      rabiesCompliance = {
        isCompliant: false,
        vaccination: null,
        expiresAt: null,
        daysUntilExpiry: null,
        message: 'No rabies vaccination on record',
      };
    } else {
      let expiresAt: Date;
      let usingDefault = false;
      if (rabiesVax.expiresAt) {
        expiresAt = new Date(rabiesVax.expiresAt);
      } else {
        expiresAt = new Date(rabiesVax.administeredAt);
        expiresAt.setDate(expiresAt.getDate() + DEFAULT_VACCINATION_VALIDITY_DAYS);
        usingDefault = true;
      }
      const isExpired = expiresAt < now;
      const daysUntil = daysBetween(now, expiresAt);
      
      rabiesCompliance = {
        isCompliant: !isExpired,
        vaccination: rabiesVax,
        expiresAt: expiresAt.toISOString(),
        daysUntilExpiry: daysUntil,
        message: isExpired 
          ? 'Rabies vaccination has expired'
          : daysUntil <= 30 
            ? `Expires in ${daysUntil} days${usingDefault ? ' (default)' : ''}`
            : 'Current',
      };
    }
    
    return {
      ...pet,
      vaccinationCount: vaccinations.length,
      healthRecordCount: healthRecords.length,
      rabiesCompliance,
    };
  });
  
  res.json({ success: true, data: { pets: summaries, total: summaries.length } });
});

// Maximum pets per user
const MAX_PETS_PER_USER = 50;

router.post(
  '/',
  authenticate,
  validate(createPetSchema),
  (req: Request, res: Response<ApiResponse<Pet>>) => {
    // Check pet limit
    const existingPets = getPetsByOwner(req.user!.id);
    if (existingPets.length >= MAX_PETS_PER_USER) {
      throw new ValidationError(`Maximum ${MAX_PETS_PER_USER} pets allowed per account`);
    }
    
    // Check for duplicate pet names (case-insensitive)
    const normalizedName = (req.body.name as string).toLowerCase().trim();
    const duplicateName = existingPets.find(
      p => p.name.toLowerCase().trim() === normalizedName
    );
    if (duplicateName) {
      throw new ValidationError(`You already have a pet named "${duplicateName.name}"`);
    }
    
    const pet = createPet(req.user!.id, {
      name: req.body.name,
      species: req.body.species,
      breed: req.body.breed ?? null,
      sex: req.body.sex ?? 'UNKNOWN',
      dateOfBirth: req.body.dateOfBirth ?? null,
      color: req.body.color ?? null,
      weight: req.body.weight ?? null,
      microchipId: req.body.microchipId ?? null,
      photoUrl: null,
    });
    res.status(201).json({ success: true, data: pet });
  }
);

router.get(
  '/:petId',
  authenticate,
  validate(petIdParamSchema, 'params'),
  (req: Request, res: Response<ApiResponse<Pet>>) => {
    const pet = verifyPetOwnership(req.params['petId']!, req.user!.id);
    res.json({ success: true, data: pet });
  }
);

router.patch(
  '/:petId',
  authenticate,
  validate(petIdParamSchema, 'params'),
  validate(updatePetSchema),
  (req: Request, res: Response<ApiResponse<Pet>>) => {
    const currentPet = verifyPetOwnership(req.params['petId']!, req.user!.id);
    
    // Check for duplicate name if name is being changed
    if (req.body.name !== undefined) {
      const normalizedName = (req.body.name as string).toLowerCase().trim();
      const existingPets = getPetsByOwner(req.user!.id);
      const duplicateName = existingPets.find(
        p => p.id !== currentPet.id && p.name.toLowerCase().trim() === normalizedName
      );
      if (duplicateName) {
        throw new ValidationError(`You already have a pet named "${duplicateName.name}"`);
      }
    }
    
    const pet = updatePet(req.params['petId']!, req.body);
    res.json({ success: true, data: pet! });
  }
);

router.delete(
  '/:petId',
  authenticate,
  validate(petIdParamSchema, 'params'),
  (req: Request, res: Response<ApiResponse>) => {
    const pet = verifyPetOwnership(req.params['petId']!, req.user!.id);
    // Delete photo if exists
    if (pet.photoUrl) {
      const filename = getFilenameFromUrl(pet.photoUrl);
      if (filename) deletePhoto(filename);
    }
    updatePet(req.params['petId']!, { isActive: false });
    res.json({ success: true, data: { message: 'Pet deleted successfully' } });
  }
);

// Photo Upload
router.post(
  '/:petId/photo',
  authenticate,
  uploadLimiter,
  validate(petIdParamSchema, 'params'),
  (req: Request, res: Response, next: NextFunction) => {
    // First verify ownership before accepting upload
    verifyPetOwnership(req.params['petId']!, req.user!.id);
    next();
  },
  uploadSingle,
  asyncHandler(async (req: Request, res: Response<ApiResponse<{ photoUrl: string }>>) => {
    const pet = verifyPetOwnership(req.params['petId']!, req.user!.id);
    
    if (!req.file) {
      throw new ValidationError('No photo file provided');
    }

    // Verify file content matches declared MIME type (magic byte check)
    if (!verifyFileMagicBytes(req.file.path, req.file.mimetype)) {
      // Delete the uploaded file - content doesn't match declared type
      deletePhoto(req.file.filename);
      throw new ValidationError('File content does not match declared type. Possible file spoofing detected.');
    }

    // Delete old photo if exists
    if (pet.photoUrl) {
      const oldFilename = getFilenameFromUrl(pet.photoUrl);
      if (oldFilename) deletePhoto(oldFilename);
    }

    const photoUrl = getPhotoUrl(req.file.filename);
    updatePet(req.params['petId']!, { photoUrl });

    res.json({ success: true, data: { photoUrl } });
  })
);

router.delete(
  '/:petId/photo',
  authenticate,
  validate(petIdParamSchema, 'params'),
  (req: Request, res: Response<ApiResponse>) => {
    const pet = verifyPetOwnership(req.params['petId']!, req.user!.id);
    
    if (pet.photoUrl) {
      const filename = getFilenameFromUrl(pet.photoUrl);
      if (filename) deletePhoto(filename);
      updatePet(req.params['petId']!, { photoUrl: null });
    }

    res.json({ success: true, data: { message: 'Photo deleted successfully' } });
  }
);

// Health Records
router.get(
  '/:petId/health',
  authenticate,
  validate(petIdParamSchema, 'params'),
  (req: Request, res: Response<ApiResponse<HealthRecordListResponse>>) => {
    verifyPetOwnership(req.params['petId']!, req.user!.id);
    const records = getHealthRecordsByPet(req.params['petId']!);
    res.json({ success: true, data: { records, total: records.length } });
  }
);

router.post(
  '/:petId/health',
  authenticate,
  validate(petIdParamSchema, 'params'),
  validate(createHealthRecordSchema),
  (req: Request, res: Response<ApiResponse<HealthRecord>>) => {
    verifyPetOwnership(req.params['petId']!, req.user!.id);
    const record = createHealthRecord(req.params['petId']!, {
      type: req.body.type,
      title: req.body.title,
      description: req.body.description ?? null,
      date: req.body.date,
      vetName: req.body.vetName ?? null,
      clinicName: req.body.clinicName ?? null,
      expiresAt: req.body.expiresAt ?? null,
      documentUrl: null,
    });
    res.status(201).json({ success: true, data: record });
  }
);

// Vaccinations
router.get(
  '/:petId/vaccinations',
  authenticate,
  validate(petIdParamSchema, 'params'),
  (req: Request, res: Response<ApiResponse<VaccinationListResponse>>) => {
    verifyPetOwnership(req.params['petId']!, req.user!.id);
    const vaccinations = getVaccinationsByPet(req.params['petId']!);
    res.json({ success: true, data: { vaccinations, total: vaccinations.length } });
  }
);

router.post(
  '/:petId/vaccinations',
  authenticate,
  validate(petIdParamSchema, 'params'),
  validate(createVaccinationSchema),
  (req: Request, res: Response<ApiResponse<Vaccination>>) => {
    verifyPetOwnership(req.params['petId']!, req.user!.id);
    const vaccination = createVaccination(req.params['petId']!, {
      type: req.body.type,
      name: req.body.name,
      manufacturer: req.body.manufacturer ?? null,
      batchNumber: req.body.batchNumber ?? null,
      administeredAt: req.body.administeredAt,
      expiresAt: req.body.expiresAt ?? null,
      vetName: req.body.vetName ?? null,
      clinicName: req.body.clinicName ?? null,
      documentUrl: null,
    });
    res.status(201).json({ success: true, data: vaccination });
  }
);

// Rabies Compliance
router.get(
  '/:petId/compliance/rabies',
  authenticate,
  validate(petIdParamSchema, 'params'),
  (req: Request, res: Response<ApiResponse<RabiesCompliance>>) => {
    verifyPetOwnership(req.params['petId']!, req.user!.id);
    const vaccinations = getVaccinationsByPet(req.params['petId']!);
    const rabiesVax = vaccinations
      .filter((v) => v.type === 'RABIES')
      .sort((a, b) => new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime())[0];

    if (!rabiesVax) {
      res.json({
        success: true,
        data: {
          isCompliant: false,
          vaccination: null,
          expiresAt: null,
          daysUntilExpiry: null,
          message: 'No rabies vaccination on record',
        },
      });
      return;
    }

    const now = new Date();
    
    // Calculate expiry date: use explicit expiry or default to 1 year from administration
    let expiresAt: Date;
    let usingDefaultExpiry = false;
    if (rabiesVax.expiresAt) {
      expiresAt = new Date(rabiesVax.expiresAt);
    } else {
      // Default: 1 year from administration date (veterinary standard)
      expiresAt = new Date(rabiesVax.administeredAt);
      expiresAt.setDate(expiresAt.getDate() + DEFAULT_VACCINATION_VALIDITY_DAYS);
      usingDefaultExpiry = true;
    }
    
    const isExpired = expiresAt < now;
    const daysUntilExpiry = daysBetween(now, expiresAt);

    res.json({
      success: true,
      data: {
        isCompliant: !isExpired,
        vaccination: rabiesVax,
        expiresAt: expiresAt.toISOString(),
        daysUntilExpiry,
        message: isExpired
          ? 'Rabies vaccination has expired'
          : daysUntilExpiry <= 30
          ? `Rabies vaccination expires in ${daysUntilExpiry} days${usingDefaultExpiry ? ' (default 1-year validity)' : ''}`
          : `Rabies vaccination is current${usingDefaultExpiry ? ' (default 1-year validity applied)' : ''}`,
      },
    });
  }
);

// QR Code - Basic data
router.get(
  '/:petId/qr',
  authenticate,
  validate(petIdParamSchema, 'params'),
  (req: Request, res: Response<ApiResponse>) => {
    const pet = verifyPetOwnership(req.params['petId']!, req.user!.id);
    res.json({
      success: true,
      data: {
        petportId: pet.petportId,
        verifyUrl: `https://petport.app/verify/${pet.petportId}`,
        qrData: JSON.stringify({ petportId: pet.petportId, v: 1 }),
      },
    });
  }
);

// QR Code - Image (data URL + SVG)
router.get(
  '/:petId/qr/image',
  authenticate,
  validate(petIdParamSchema, 'params'),
  asyncHandler(async (req: Request, res: Response<ApiResponse>) => {
    const pet = verifyPetOwnership(req.params['petId']!, req.user!.id);
    const qrData = await generateQRCode(pet.petportId);
    res.json({ success: true, data: qrData });
  })
);

// QR Code - PNG download
router.get(
  '/:petId/qr/png',
  authenticate,
  validate(petIdParamSchema, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const pet = verifyPetOwnership(req.params['petId']!, req.user!.id);
    const buffer = await generateQRCodeBuffer(pet.petportId);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${pet.petportId}-qr.png"`);
    res.send(buffer);
  })
);

// Pet Passport PDF
router.get(
  '/:petId/passport',
  authenticate,
  validate(petIdParamSchema, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const pet = verifyPetOwnership(req.params['petId']!, req.user!.id);
    const owner = userStore.get(pet.ownerId);
    const vaccinations = getVaccinationsByPet(pet.id);
    
    const pdfBuffer = await generatePassportPDF({
      pet,
      owner: { name: owner?.name ?? 'Unknown', email: owner?.email ?? '' },
      vaccinations,
      generatedAt: new Date().toISOString(),
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pet.petportId}-passport.pdf"`);
    res.send(pdfBuffer);
  })
);

export const petRoutes = router;
