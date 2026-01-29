import { z } from 'zod';

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Nigerian phone number validation (optional +234 prefix)
const nigerianPhoneRegex = /^(\+234|0)?[789]\d{9}$/;

// Password requirements message
const passwordRequirements =
    'Password must be at least 8 characters with uppercase, lowercase, and number';

/**
 * Register validation schema
 */
export const registerSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .regex(emailRegex, 'Invalid email format'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, passwordRequirements)
        .regex(/[a-z]/, passwordRequirements)
        .regex(/\d/, passwordRequirements),
    confirmPassword: z
        .string()
        .min(1, 'Confirm password is required'),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

/**
 * Verify OTP validation schema
 */
export const verifyOtpSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .regex(emailRegex, 'Invalid email format'),
    otp: z
        .string()
        .length(6, 'OTP must be 6 digits')
        .regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

/**
 * Resend OTP validation schema
 */
export const resendOtpSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .regex(emailRegex, 'Invalid email format'),
});

/**
 * Complete profile validation schema
 */
export const completeProfileSchema = z.object({
    firstName: z
        .string()
        .min(2, 'First name must be at least 2 characters')
        .max(50, 'First name must be at most 50 characters')
        .regex(/^[a-zA-Z\s-]+$/, 'First name can only contain letters, spaces, and hyphens'),
    lastName: z
        .string()
        .min(2, 'Last name must be at least 2 characters')
        .max(50, 'Last name must be at most 50 characters')
        .regex(/^[a-zA-Z\s-]+$/, 'Last name can only contain letters, spaces, and hyphens'),
    middleName: z
        .string()
        .max(50, 'Middle name must be at most 50 characters')
        .regex(/^[a-zA-Z\s-]*$/, 'Middle name can only contain letters, spaces, and hyphens')
        .optional()
        .or(z.literal('')),
    phoneNumber: z
        .string()
        .min(1, 'Phone number is required')
        .regex(nigerianPhoneRegex, 'Invalid Nigerian phone number (e.g., 08012345678 or +2348012345678)'),
});

/**
 * Login validation schema
 */
export const loginSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .regex(emailRegex, 'Invalid email format'),
    password: z
        .string()
        .min(1, 'Password is required'),
});

/**
 * Refresh token validation schema
 */
export const refreshTokenSchema = z.object({
    refreshToken: z
        .string()
        .min(1, 'Refresh token is required'),
});

/**
 * Forgot password validation schema
 */
export const forgotPasswordSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .regex(emailRegex, 'Invalid email format'),
});

/**
 * Reset password validation schema
 */
export const resetPasswordSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .regex(emailRegex, 'Invalid email format'),
    otp: z
        .string()
        .length(6, 'OTP must be 6 digits')
        .regex(/^\d{6}$/, 'OTP must be 6 digits'),
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
});

// Type exports from schemas
export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
