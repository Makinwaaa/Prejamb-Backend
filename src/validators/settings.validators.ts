import { z } from 'zod';

// Password requirements message
const passwordRequirements =
    'Password must be at least 8 characters with uppercase, lowercase, and number';

/**
 * Change password validation schema
 */
export const changePasswordSchema = z.object({
    oldPassword: z
        .string()
        .min(1, 'Current password is required'),
    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, passwordRequirements)
        .regex(/[a-z]/, passwordRequirements)
        .regex(/\d/, passwordRequirements),
    confirmPassword: z
        .string()
        .min(1, 'Confirm password is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
}).refine((data) => data.oldPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
});

/**
 * Update preferences validation schema
 * Font size: 1-5 (12px, 14px, 16px, 18px, 20px)
 * Theme: light, dark, auto (system default)
 */
export const updatePreferencesSchema = z.object({
    fontSize: z
        .number()
        .int('Font size must be an integer')
        .min(1, 'Font size must be between 1 and 5')
        .max(5, 'Font size must be between 1 and 5')
        .optional(),
    theme: z
        .enum(['light', 'dark', 'auto'], {
            errorMap: () => ({ message: 'Theme must be light, dark, or auto' }),
        })
        .optional(),
}).refine((data) => data.fontSize !== undefined || data.theme !== undefined, {
    message: 'At least one preference must be provided',
});

// Account disable/delete reason options
export const accountActionReasons = [
    'NO_LONGER_NEED',
    'FOUND_ALTERNATIVE',
    'PRIVACY_CONCERNS',
    'TOO_EXPENSIVE',
    'TECHNICAL_ISSUES',
    'POOR_EXPERIENCE',
    'TEMPORARY_BREAK',
    'OTHER',
] as const;

/**
 * Initiate account action (disable/delete) validation schema
 */
export const initiateAccountActionSchema = z.object({
    reason: z.enum(accountActionReasons, {
        errorMap: () => ({ message: 'Please select a valid reason' }),
    }),
});

/**
 * Verify account action OTP validation schema
 */
export const verifyAccountActionSchema = z.object({
    otp: z
        .string()
        .length(6, 'OTP must be 6 digits')
        .regex(/^\d{6}$/, 'OTP must be 6 digits'),
    reason: z.string().optional(),
});

// Support ticket issue types
export const issueTypes = [
    'TECHNICAL',
    'BILLING',
    'ACCOUNT',
    'SUBSCRIPTION',
    'FEEDBACK',
    'OTHER',
] as const;

/**
 * Create support ticket validation schema
 */
export const createSupportTicketSchema = z.object({
    issueType: z.enum(issueTypes, {
        errorMap: () => ({ message: 'Please select a valid issue type' }),
    }),
    description: z
        .string()
        .min(10, 'Description must be at least 10 characters')
        .max(2000, 'Description must be at most 2000 characters'),
    attachmentUrl: z
        .string()
        .url('Invalid attachment URL')
        .optional()
        .or(z.literal('')),
});

// Type exports from schemas
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type InitiateAccountActionInput = z.infer<typeof initiateAccountActionSchema>;
export type VerifyAccountActionInput = z.infer<typeof verifyAccountActionSchema>;
export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;
export type AccountActionReason = typeof accountActionReasons[number];
export type IssueTypeOption = typeof issueTypes[number];
