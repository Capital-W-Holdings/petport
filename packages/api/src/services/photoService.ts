import multer from 'multer';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, unlinkSync, readFileSync } from 'fs';
import { join, extname, resolve } from 'path';
import { ValidationError } from '@petport/shared';
import { config } from '../config/index.js';

// Ensure upload directory exists
const uploadDir = resolve(config.uploadDir);
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

// Allowed MIME types and their magic bytes
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header (WebP starts with RIFF)
};

const MAX_FILE_SIZE = config.maxFileSize; // 10MB default

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueId = randomUUID();
    // Sanitize extension - only allow known extensions
    const ext = extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `${uniqueId}${safeExt}`);
  },
});

// File filter
const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`));
  }
};

// Create multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

// Single file upload middleware
export const uploadSingle = upload.single('photo');

/**
 * Verify file content matches declared MIME type using magic bytes
 */
export function verifyFileMagicBytes(filepath: string, declaredMime: string): boolean {
  try {
    const buffer = readFileSync(filepath);
    const expectedPatterns = MAGIC_BYTES[declaredMime];
    if (!expectedPatterns) return false;
    
    return expectedPatterns.some(pattern => {
      for (let i = 0; i < pattern.length; i++) {
        if (buffer[i] !== pattern[i]) return false;
      }
      return true;
    });
  } catch {
    return false;
  }
}

/**
 * Sanitize filename - only allow safe characters
 */
function sanitizeFilename(filename: string): string | null {
  // Only allow alphanumeric, dash, underscore, dot
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '');
  // Reject if different from original or contains path traversal
  if (sanitized !== filename || filename.includes('..')) {
    return null;
  }
  return sanitized;
}

/**
 * Get the public URL for an uploaded file
 */
export function getPhotoUrl(filename: string): string {
  return `${config.publicUrl}/uploads/${filename}`;
}

/**
 * Delete a photo file (with path traversal protection)
 */
export function deletePhoto(filename: string): boolean {
  // Sanitize filename to prevent path traversal
  const sanitized = sanitizeFilename(filename);
  if (!sanitized) {
    return false;
  }
  
  const filePath = join(uploadDir, sanitized);
  const resolvedPath = resolve(filePath);
  
  // Verify resolved path is still within upload directory
  if (!resolvedPath.startsWith(uploadDir)) {
    return false; // Path traversal attempt blocked
  }
  
  try {
    if (existsSync(resolvedPath)) {
      unlinkSync(resolvedPath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Extract filename from URL
 */
export function getFilenameFromUrl(url: string): string | null {
  const match = url.match(/\/uploads\/([^/]+)$/);
  return match ? match[1] ?? null : null;
}
