import { z } from 'zod';

export const examHistoryQuerySchema = z.object({
    query: z.object({
        mode: z.enum(['PURE_JAMB', 'JAMB_AI', 'SINGLE_SUBJECT']).optional(),
        page: z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    }),
});
