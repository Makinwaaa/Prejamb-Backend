import { Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { AuthenticatedRequest } from '../types';
import { sendValidationError } from '../utils/response.utils';

/**
 * Validation middleware factory
 * Validates request body against provided Zod schema
 */
export const validate = (schema: ZodSchema) => {
    return async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const validatedData = await schema.parseAsync(req.body);
            req.body = validatedData;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errors: Record<string, string[]> = {};

                error.errors.forEach((err) => {
                    const path = err.path.join('.');
                    if (!errors[path]) {
                        errors[path] = [];
                    }
                    errors[path].push(err.message);
                });

                sendValidationError(res, errors);
                return;
            }
            next(error);
        }
    };
};
