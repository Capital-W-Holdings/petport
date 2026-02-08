import { Request, Response, NextFunction } from 'express';
import { UserRole, ROLE_HIERARCHY, AuthorizationError } from '@petport/shared';
import { createAuditLog } from '../services/database.js';

/**
 * Check if user has at least the required role level
 */
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Middleware factory for role-based access control
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthorizationError('Authentication required'));
    }

    const hasPermission = allowedRoles.some((role) =>
      hasMinimumRole(req.user!.role, role)
    );

    if (!hasPermission) {
      return next(
        new AuthorizationError(
          `Access denied. Required role: ${allowedRoles.join(' or ')}`
        )
      );
    }

    next();
  };
}

/**
 * Require ADMIN or higher role
 */
export const requireAdmin = requireRole('ADMIN');

/**
 * Require SUPER_ADMIN role only
 */
export const requireSuperAdmin = requireRole('SUPER_ADMIN');

/**
 * Audit logging middleware for admin actions
 * Use after authentication and authorization middleware
 */
export function auditLog(action: string, targetType: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Capture the original json method to log after response is sent
    const originalJson = res.json.bind(res);

    res.json = (body: unknown) => {
      // Only log successful actions (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        // Fire and forget - don't block the response
        setImmediate(() => {
          try {
            createAuditLog({
              adminUserId: req.user!.id,
              action,
              targetType,
              targetId: req.params.id || req.params.userId || null,
              details: JSON.stringify({
                method: req.method,
                path: req.path,
                body: req.body,
              }),
              ipAddress: req.ip || req.socket.remoteAddress || null,
              userAgent: req.headers['user-agent'] || null,
            });
          } catch (error) {
            // Don't fail the request if audit logging fails
            console.error('Audit logging failed:', error);
          }
        });
      }
      return originalJson(body);
    };

    next();
  };
}
