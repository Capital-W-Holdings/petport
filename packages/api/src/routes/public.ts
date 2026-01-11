import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ApiResponse, Pet, NotFoundError, DEFAULT_VACCINATION_VALIDITY_DAYS } from '@petport/shared';
import { validate } from '../middleware/validation.js';
import { standardLimiter } from '../middleware/rateLimiter.js';
import { getPetByPetportId, getVaccinationsByPet, userStore } from '../services/database.js';

const router = Router();

const verifyParamsSchema = z.object({
  petportId: z.string().regex(/^PP-[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Invalid PetPort ID format'),
});

interface PublicPetInfo {
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

router.get(
  '/verify/:petportId',
  standardLimiter,
  validate(verifyParamsSchema, 'params'),
  (req: Request, res: Response<ApiResponse<PublicPetInfo>>) => {
    const pet = getPetByPetportId(req.params['petportId']!);
    if (!pet) {
      throw new NotFoundError('Pet', req.params['petportId']);
    }

    const owner = userStore.get(pet.ownerId);
    const vaccinations = getVaccinationsByPet(pet.id);
    const rabiesVax = vaccinations
      .filter((v) => v.type === 'RABIES')
      .sort((a, b) => new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime())[0];

    const now = new Date();
    let isRabiesCompliant = false;
    let rabiesExpiryDate: Date | null = null;
    
    if (rabiesVax) {
      // Calculate expiry: use explicit or default to 1 year from administration
      if (rabiesVax.expiresAt) {
        rabiesExpiryDate = new Date(rabiesVax.expiresAt);
      } else {
        rabiesExpiryDate = new Date(rabiesVax.administeredAt);
        rabiesExpiryDate.setDate(rabiesExpiryDate.getDate() + DEFAULT_VACCINATION_VALIDITY_DAYS);
      }
      isRabiesCompliant = rabiesExpiryDate >= now;
    }

    res.json({
      success: true,
      data: {
        petportId: pet.petportId,
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        photoUrl: pet.photoUrl,
        verificationLevel: pet.verificationLevel,
        ownerName: owner?.name?.split(' ')[0] ?? 'Unknown', // First name only for privacy
        rabiesStatus: {
          isCompliant: isRabiesCompliant,
          expiresAt: rabiesExpiryDate?.toISOString() ?? null,
        },
      },
    });
  }
);

export const publicRoutes = router;
