import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { ApiResponse, AuthResponse, User, AuthenticationError, ConflictError } from '@petport/shared';
import { validate } from '../middleware/validation.js';
import { authenticate, generateToken } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { config } from '../config/index.js';
import { blacklistToken } from '../services/tokenBlacklist.js';
import { generateResetToken, consumeResetToken } from '../services/passwordReset.js';
import {
  createUser,
  getUserByEmail,
  userStore,
  updateUserPassword,
  getPetsByOwner,
  getHealthRecordsByPet,
  getVaccinationsByPet,
} from '../services/database.js';

const router = Router();

// Wrap async handlers to properly forward errors
type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
const asyncHandler = (fn: AsyncHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const registerSchema = z.object({
  email: z.string().email('Invalid email address').transform(e => e.toLowerCase().trim()),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100).transform(n => n.trim()),
  phone: z.string().optional().nullable(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').transform(e => e.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req: Request, res: Response<ApiResponse<AuthResponse>>) => {
    const { email, password, name, phone } = req.body;

    const existing = getUserByEmail(email);
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    const user = createUser({
      email, // Already normalized by zod transform
      passwordHash,
      name,
      phone: phone ?? null,
      avatarUrl: null,
      isVerified: false,
      role: 'USER', // New users get USER role by default
    });

    const token = generateToken(user.id, user.email, user.role);
    const { passwordHash: _, ...userResponse } = user;

    res.status(201).json({
      success: true,
      data: {
        user: userResponse as User,
        tokens: { accessToken: token, expiresIn: 604800 },
      },
    });
  })
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req: Request, res: Response<ApiResponse<AuthResponse>>) => {
    const { email, password } = req.body;

    const user = getUserByEmail(email);
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new AuthenticationError('Invalid email or password');
    }

    const token = generateToken(user.id, user.email, user.role);
    const { passwordHash: _, ...userResponse } = user;

    res.json({
      success: true,
      data: {
        user: userResponse as User,
        tokens: { accessToken: token, expiresIn: 604800 },
      },
    });
  })
);

router.post('/logout', authenticate, asyncHandler(async (req: Request, res: Response<ApiResponse>) => {
  // Blacklist the token until its natural expiry
  if (req.token && req.tokenExp) {
    await blacklistToken(req.token, req.tokenExp);
  }
  res.json({ success: true, data: { message: 'Logged out successfully' } });
}));

router.get('/me', authenticate, (req: Request, res: Response<ApiResponse<User>>) => {
  const user = userStore.get(req.user!.id);
  if (!user) {
    throw new AuthenticationError('User not found');
  }
  const { passwordHash: _, ...userResponse } = user;
  res.json({ success: true, data: userResponse as User });
});

// Password Reset - Request
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').transform(e => e.toLowerCase().trim()),
});

router.post(
  '/forgot-password',
  authLimiter, // Rate limit to prevent abuse
  validate(forgotPasswordSchema),
  (req: Request, res: Response<ApiResponse>) => {
    const { email } = req.body;
    const user = getUserByEmail(email);
    
    // Always return success to prevent email enumeration
    // In production, this would send an email
    if (user) {
      const token = generateResetToken(user.id, user.email);
      const resetUrl = `${config.publicUrl}/reset-password?token=${token}`;
      
      // In development, log the reset link
      // In production, this would send an email via SendGrid/SES/etc.
      if (config.env !== 'production') {
        console.log(`\n[Password Reset] Link for ${email}:\n${resetUrl}\n`);
      }
      // TODO: In production, call email service here
      // await emailService.sendPasswordReset(email, resetUrl);
    }
    
    res.json({
      success: true,
      data: {
        message: 'If an account exists with this email, a password reset link has been sent.',
      },
    });
  }
);

// Password Reset - Complete
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  asyncHandler(async (req: Request, res: Response<ApiResponse>) => {
    const { token, password } = req.body;
    
    const tokenData = consumeResetToken(token);
    if (!tokenData) {
      throw new AuthenticationError('Invalid or expired reset token');
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    
    // Update password
    updateUserPassword(tokenData.userId, passwordHash);
    
    res.json({
      success: true,
      data: {
        message: 'Password has been reset successfully. You can now log in with your new password.',
      },
    });
  })
);

// Data Export - GDPR compliant data export
router.get('/export', authenticate, (req: Request, res: Response<ApiResponse>) => {
  const user = userStore.get(req.user!.id);
  if (!user) {
    throw new AuthenticationError('User not found');
  }

  // Get all user's pets with their records
  const pets = getPetsByOwner(req.user!.id).map((pet) => ({
    ...pet,
    healthRecords: getHealthRecordsByPet(pet.id),
    vaccinations: getVaccinationsByPet(pet.id),
  }));

  // Remove sensitive data
  const { passwordHash: _, ...userExport } = user;

  res.json({
    success: true,
    data: {
      user: userExport,
      pets,
      exportedAt: new Date().toISOString(),
      format: 'PetPort Data Export v1',
    },
  });
});

export const authRoutes = router;
