import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import { ApiResponse, User, UserRole, NotFoundError, ValidationError } from '@petport/shared';
import { validate } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin, requireSuperAdmin, auditLog } from '../middleware/authorization.js';
import {
  userStore,
  getAllUsers,
  getUsersByRole,
  updateUserRole,
  getAuditLogs,
  getStats,
  getSecurityMetrics,
  getSecurityMetricsCounts,
  StoredUser,
} from '../services/database.js';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// Wrap async handlers to properly forward errors
type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
const asyncHandler = (fn: AsyncHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Helper to sanitize user (remove passwordHash)
function sanitizeUser(user: StoredUser): User {
  const { passwordHash: _, ...safe } = user;
  return safe as User;
}

// =====================================================
// USER MANAGEMENT ROUTES
// =====================================================

// GET /admin/users - List all users (ADMIN+)
router.get(
  '/users',
  requireAdmin,
  (_req: Request, res: Response<ApiResponse<{ users: User[]; total: number }>>) => {
    const users = getAllUsers();
    const sanitized = users.map(sanitizeUser);

    res.json({
      success: true,
      data: { users: sanitized, total: users.length },
    });
  }
);

// GET /admin/users/:userId - Get single user (ADMIN+)
router.get(
  '/users/:userId',
  requireAdmin,
  (req: Request, res: Response<ApiResponse<User>>) => {
    const user = userStore.get(req.params.userId);
    if (!user) {
      throw new NotFoundError('User', req.params.userId);
    }

    res.json({ success: true, data: sanitizeUser(user) });
  }
);

// PATCH /admin/users/:userId/role - Update user role (SUPER_ADMIN only)
const updateRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']),
});

router.patch(
  '/users/:userId/role',
  requireSuperAdmin,
  validate(updateRoleSchema),
  auditLog('UPDATE_USER_ROLE', 'user'),
  (req: Request, res: Response<ApiResponse<User>>) => {
    const { userId } = req.params;
    const { role } = req.body;

    const user = userStore.get(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    // Prevent demoting yourself
    if (userId === req.user!.id && role !== 'SUPER_ADMIN') {
      throw new ValidationError('Cannot change your own role');
    }

    updateUserRole(userId, role as UserRole);

    // Fetch updated user
    const updated = userStore.get(userId);
    if (!updated) {
      throw new NotFoundError('User', userId);
    }

    res.json({ success: true, data: sanitizeUser(updated) });
  }
);

// =====================================================
// ADMIN STATISTICS ROUTES
// =====================================================

// GET /admin/stats - Admin statistics (ADMIN+)
router.get(
  '/stats',
  requireAdmin,
  (_req: Request, res: Response<ApiResponse>) => {
    const users = getAllUsers();
    const basicStats = getStats();

    const stats = {
      ...basicStats,
      usersByRole: {
        USER: users.filter((u) => u.role === 'USER').length,
        ADMIN: users.filter((u) => u.role === 'ADMIN').length,
        SUPER_ADMIN: users.filter((u) => u.role === 'SUPER_ADMIN').length,
      },
    };

    res.json({ success: true, data: stats });
  }
);

// =====================================================
// AUDIT LOG ROUTES
// =====================================================

// GET /admin/audit - Get audit logs (SUPER_ADMIN only)
router.get(
  '/audit',
  requireSuperAdmin,
  (req: Request, res: Response<ApiResponse>) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = getAuditLogs(limit, offset);

    res.json({
      success: true,
      data: { logs, limit, offset, total: logs.length },
    });
  }
);

// =====================================================
// SECURITY AUDIT & METRICS ROUTES
// =====================================================

// Static security audit data based on codebase analysis
const SECURITY_AUDIT = {
  timestamp: new Date().toISOString(),
  overallGrade: 'C' as const,
  overallScore: 65,
  owaspCompliance: [
    {
      id: 'A01:2021',
      name: 'Broken Access Control',
      status: 'partial' as const,
      description: 'Role-based access control implemented, but room for improvement',
      findings: ['RBAC system newly implemented', 'Pet ownership verification in place'],
      recommendations: ['Add more granular permissions', 'Implement resource-level access control'],
    },
    {
      id: 'A02:2021',
      name: 'Cryptographic Failures',
      status: 'pass' as const,
      description: 'Passwords properly hashed with bcrypt',
      findings: ['bcrypt with configurable rounds', 'JWT tokens for authentication'],
      recommendations: ['Consider adding token rotation'],
    },
    {
      id: 'A03:2021',
      name: 'Injection',
      status: 'pass' as const,
      description: 'Parameterized queries and React XSS protection',
      findings: ['SQL parameterized queries used', 'React sanitizes output by default'],
      recommendations: [],
    },
    {
      id: 'A04:2021',
      name: 'Insecure Design',
      status: 'warning' as const,
      description: 'Some security design patterns could be improved',
      findings: ['Token stored in localStorage (XSS vulnerable)'],
      recommendations: ['Consider httpOnly cookies for tokens', 'Add CSRF protection'],
    },
    {
      id: 'A05:2021',
      name: 'Security Misconfiguration',
      status: 'fail' as const,
      description: 'Missing security headers',
      findings: ['No CSP header', 'No HSTS header', 'No X-Frame-Options'],
      recommendations: ['Add Content-Security-Policy', 'Add Strict-Transport-Security', 'Add X-Frame-Options: DENY'],
    },
    {
      id: 'A06:2021',
      name: 'Vulnerable Components',
      status: 'warning' as const,
      description: 'Dependency audit recommended',
      findings: ['Regular dependency updates needed'],
      recommendations: ['Run npm audit regularly', 'Consider automated dependency updates'],
    },
    {
      id: 'A07:2021',
      name: 'Identification and Authentication Failures',
      status: 'partial' as const,
      description: 'JWT auth implemented with some gaps',
      findings: ['JWT-based authentication', 'Token blacklisting for logout', 'localStorage token storage'],
      recommendations: ['Add refresh token rotation', 'Move to httpOnly cookies'],
    },
    {
      id: 'A08:2021',
      name: 'Software and Data Integrity Failures',
      status: 'pass' as const,
      description: 'Data integrity maintained',
      findings: ['Database transactions for atomic operations'],
      recommendations: [],
    },
    {
      id: 'A09:2021',
      name: 'Security Logging and Monitoring Failures',
      status: 'partial' as const,
      description: 'Basic logging present, monitoring needed',
      findings: ['Admin audit logging implemented', 'Security metrics tracking added'],
      recommendations: ['Add real-time alerting', 'Implement log aggregation'],
    },
    {
      id: 'A10:2021',
      name: 'Server-Side Request Forgery',
      status: 'pass' as const,
      description: 'No SSRF vulnerabilities identified',
      findings: ['No external URL fetching from user input'],
      recommendations: [],
    },
  ],
  complianceIndicators: [
    {
      standard: 'SOC2' as const,
      status: 'partial' as const,
      coverage: 45,
      details: 'Basic security controls in place, audit logging implemented',
    },
    {
      standard: 'GDPR' as const,
      status: 'partial' as const,
      coverage: 60,
      details: 'Data export feature present, deletion needs implementation',
    },
  ],
  categories: [
    {
      name: 'Authentication',
      score: 7,
      maxScore: 10,
      status: 'warning' as const,
      items: [
        { name: 'JWT Implementation', status: 'pass' as const, description: 'JWT tokens with expiry', severity: 'low' as const },
        { name: 'Password Hashing', status: 'pass' as const, description: 'bcrypt with proper rounds', severity: 'low' as const },
        { name: 'Token Storage', status: 'warning' as const, description: 'localStorage is XSS vulnerable', severity: 'medium' as const },
        { name: 'CSRF Protection', status: 'fail' as const, description: 'No CSRF tokens implemented', severity: 'high' as const },
      ],
    },
    {
      name: 'File Upload',
      score: 6,
      maxScore: 10,
      status: 'warning' as const,
      items: [
        { name: 'MIME Type Validation', status: 'pass' as const, description: 'Client-side validation present', severity: 'low' as const },
        { name: 'Size Limits', status: 'pass' as const, description: '10MB limit enforced', severity: 'low' as const },
        { name: 'Extension Validation', status: 'warning' as const, description: 'Could be more strict', severity: 'medium' as const },
        { name: 'Virus Scanning', status: 'fail' as const, description: 'No virus scanning implemented', severity: 'medium' as const },
      ],
    },
    {
      name: 'API Security',
      score: 8,
      maxScore: 10,
      status: 'good' as const,
      items: [
        { name: 'Rate Limiting', status: 'pass' as const, description: 'Rate limiting on auth endpoints', severity: 'low' as const },
        { name: 'Input Validation', status: 'pass' as const, description: 'Zod schemas for validation', severity: 'low' as const },
        { name: 'Error Handling', status: 'pass' as const, description: 'Consistent error responses', severity: 'low' as const },
        { name: 'Authorization', status: 'pass' as const, description: 'Role-based access control', severity: 'low' as const },
      ],
    },
  ],
};

// GET /admin/security/audit - Get static security audit (ADMIN+)
router.get(
  '/security/audit',
  requireAdmin,
  (_req: Request, res: Response<ApiResponse>) => {
    res.json({
      success: true,
      data: SECURITY_AUDIT,
    });
  }
);

// GET /admin/security/metrics - Get live security metrics (ADMIN+)
router.get(
  '/security/metrics',
  requireAdmin,
  (_req: Request, res: Response<ApiResponse>) => {
    // Get counts for different time periods
    const counts24h = getSecurityMetricsCounts(24);
    const counts7d = getSecurityMetricsCounts(168); // 7 days

    // Get recent events
    const recentFailedLogins = getSecurityMetrics('FAILED_LOGIN', 10);
    const suspiciousActivity = getSecurityMetrics('SUSPICIOUS_ACTIVITY', 10);

    const metrics = {
      timestamp: new Date().toISOString(),
      failedLogins: {
        last24Hours: counts24h['FAILED_LOGIN'] || 0,
        last7Days: counts7d['FAILED_LOGIN'] || 0,
        recentAttempts: recentFailedLogins.map((m) => ({
          timestamp: m.createdAt,
          email: m.email,
          ipAddress: m.ipAddress,
          userAgent: m.userAgent,
          reason: m.details ? JSON.parse(m.details).reason : 'Unknown',
        })),
      },
      apiErrors: {
        errorRate: 0, // Would need request tracking to calculate
        totalRequests24h: 0,
        errors24h: counts24h['API_ERROR'] || 0,
        byStatusCode: {},
      },
      tokenUsage: {
        activeTokens: 0, // Would need token tracking
        tokensIssued24h: counts24h['TOKEN_ISSUED'] || 0,
        tokensRevoked24h: counts24h['TOKEN_REVOKED'] || 0,
      },
      suspiciousActivity: suspiciousActivity.map((m) => ({
        id: m.id,
        type: 'suspicious_activity',
        description: m.details || 'Suspicious activity detected',
        timestamp: m.createdAt,
        severity: 'medium' as const,
        resolved: false,
      })),
      rateLimiting: {
        enabled: true,
        blockedRequests24h: counts24h['RATE_LIMITED'] || 0,
        topBlockedIPs: [],
      },
    };

    res.json({
      success: true,
      data: metrics,
    });
  }
);

export const adminRoutes = router;
