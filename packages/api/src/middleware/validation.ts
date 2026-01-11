import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

type ValidationType = 'body' | 'query' | 'params';

export function validate<T extends z.ZodSchema>(
  schema: T,
  type: ValidationType = 'body'
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const data = type === 'body' ? req.body : type === 'query' ? req.query : req.params;
    const result = schema.safeParse(data);

    if (!result.success) {
      next(result.error);
      return;
    }

    if (type === 'body') {
      req.body = result.data;
    } else if (type === 'query') {
      req.query = result.data as typeof req.query;
    } else {
      req.params = result.data as typeof req.params;
    }

    next();
  };
}

// Common schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const petIdParamSchema = z.object({
  petId: z.string().min(1),
});
