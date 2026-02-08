import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';
import { getUserByEmail, createUser, updateUserRole, userStore } from './database.js';

/**
 * Seeds an initial SUPER_ADMIN user based on environment variables.
 *
 * Environment variables:
 * - INITIAL_SUPER_ADMIN_EMAIL: Email for the super admin user
 * - INITIAL_SUPER_ADMIN_PASSWORD: Password for the super admin user (only used if creating new user)
 *
 * If the user already exists, they will be promoted to SUPER_ADMIN.
 * If the user doesn't exist and password is provided, a new SUPER_ADMIN user will be created.
 */
export async function seedSuperAdmin(): Promise<void> {
  const email = process.env['INITIAL_SUPER_ADMIN_EMAIL'];

  if (!email) {
    logger.debug('No INITIAL_SUPER_ADMIN_EMAIL configured, skipping seed');
    return;
  }

  const existingUser = getUserByEmail(email);

  if (existingUser) {
    // User exists - promote to SUPER_ADMIN if not already
    if (existingUser.role !== 'SUPER_ADMIN') {
      updateUserRole(existingUser.id, 'SUPER_ADMIN');
      logger.info(`Promoted existing user ${email} to SUPER_ADMIN`);
    } else {
      logger.debug(`User ${email} is already SUPER_ADMIN`);
    }
  } else {
    // Create new SUPER_ADMIN with provided password
    const tempPassword = process.env['INITIAL_SUPER_ADMIN_PASSWORD'];

    if (!tempPassword) {
      logger.warn(
        'INITIAL_SUPER_ADMIN_EMAIL set but INITIAL_SUPER_ADMIN_PASSWORD not provided. ' +
          'User must already exist or provide password to create new super admin.'
      );
      return;
    }

    if (tempPassword.length < 8) {
      logger.error('INITIAL_SUPER_ADMIN_PASSWORD must be at least 8 characters');
      return;
    }

    const passwordHash = await bcrypt.hash(tempPassword, config.bcryptRounds);
    createUser({
      email,
      passwordHash,
      name: 'Super Admin',
      phone: null,
      avatarUrl: null,
      isVerified: true,
      role: 'SUPER_ADMIN',
    });

    logger.info(`Created initial SUPER_ADMIN user: ${email}`);
    logger.warn('SECURITY: Change the initial super admin password immediately after first login!');
  }
}
