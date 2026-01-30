import { z } from 'zod';

/**
 * Initialize payment validation schema
 */
export const initializePaymentSchema = z.object({
    planType: z.enum(['STARTER', 'STANDARD', 'ANNUAL'], {
        errorMap: () => ({ message: 'Plan type must be STARTER, STANDARD, or ANNUAL' }),
    }),
    paymentMethod: z.enum(['CARD', 'TRANSFER', 'USSD'], {
        errorMap: () => ({ message: 'Payment method must be CARD, TRANSFER, or USSD' }),
    }),
});

/**
 * Verify payment validation schema
 */
export const verifyPaymentSchema = z.object({
    paymentReference: z.string().min(1, 'Payment reference is required'),
    paymentGatewayReference: z.string().optional(),
});

/**
 * Check exam mode access validation schema
 */
export const checkExamModeAccessSchema = z.object({
    examMode: z.enum(['PURE_JAMB', 'JAMB_AI', 'SINGLE_SUBJECT'], {
        errorMap: () => ({ message: 'Invalid exam mode' }),
    }),
});

// Type exports
export type InitializePaymentInput = z.infer<typeof initializePaymentSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type CheckExamModeAccessInput = z.infer<typeof checkExamModeAccessSchema>;
