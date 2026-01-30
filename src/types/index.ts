// Type definitions for the Prejamb Backend API

import { Request } from 'express';
import { IUser } from '../models/user.model';

// Extend Express Request to include user
export interface AuthenticatedRequest extends Request {
    user?: IUser;
    tempUser?: {
        userId: string;
        email: string;
        type: 'email_verification' | 'profile_completion';
    };
}

// OTP Types (re-exported from model for convenience)
export type OtpType = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

// API Response Types
export interface ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
    errors?: Record<string, string[]>;
}

// Auth Response Types
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface RegisterResponse {
    message: string;
    email: string;
}

export interface VerifyOtpResponse {
    message: string;
    tempToken: string;
}

export interface LoginResponse extends AuthTokens {
    user: UserProfile;
}

export interface UserProfile {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    middleName: string | null;
    phoneNumber: string | null;
    isVerified: boolean;
    isProfileComplete: boolean;
    createdAt: Date;
    subscriptionStatus: string;
    subscriptionEndDate?: Date | null;
}

// Request Body Types
export interface RegisterBody {
    email: string;
    password: string;
    confirmPassword: string;
}

export interface VerifyOtpBody {
    email: string;
    otp: string;
}

export interface ResendOtpBody {
    email: string;
}

export interface CompleteProfileBody {
    firstName: string;
    lastName: string;
    middleName?: string;
    phoneNumber: string;
}

export interface LoginBody {
    email: string;
    password: string;
}

export interface RefreshTokenBody {
    refreshToken: string;
}

export interface ForgotPasswordBody {
    email: string;
}

export interface ResetPasswordBody {
    email: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
}

export interface ChangePasswordBody {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export interface UpdatePreferencesBody {
    fontSize?: number;
    theme?: 'light' | 'dark' | 'auto';
}

export interface InitiateAccountActionBody {
    reason: string;
}

export interface VerifyAccountActionBody {
    otp: string;
}

export interface CreateSupportTicketBody {
    issueType: string;
    description: string;
    attachmentUrl?: string;
}
