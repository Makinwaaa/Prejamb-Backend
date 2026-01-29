import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import {
    sendSuccess,
    sendError,
    sendConflict,
} from '../utils/response.utils';
import * as authService from '../services/auth.service';

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
export const register = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const result = await authService.registerUser(req.body);
        sendSuccess(
            res,
            'Registration successful. Please check your email for the OTP code.',
            result,
            201
        );
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('already exists')) {
                sendConflict(res, error.message);
                return;
            }
        }
        next(error);
    }
};

/**
 * Verify email OTP
 * POST /api/v1/auth/verify-otp
 */
export const verifyOtp = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const result = await authService.verifyEmailOtp(req.body);
        sendSuccess(
            res,
            'Email verified successfully. Please complete your profile.',
            result
        );
    } catch (error) {
        if (error instanceof Error) {
            const err = error as Error & { attemptsRemaining?: number };
            if (err.attemptsRemaining !== undefined) {
                sendError(
                    res,
                    `${error.message} ${err.attemptsRemaining} attempts remaining.`,
                    400
                );
                return;
            }
            sendError(res, error.message, 400);
            return;
        }
        next(error);
    }
};

/**
 * Resend OTP
 * POST /api/v1/auth/resend-otp
 */
export const resendOtp = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        await authService.resendOtp(req.body.email, 'EMAIL_VERIFICATION');
        sendSuccess(res, 'OTP sent successfully. Please check your email.');
    } catch (error) {
        if (error instanceof Error) {
            sendError(res, error.message, 400);
            return;
        }
        next(error);
    }
};

/**
 * Complete user profile
 * POST /api/v1/auth/complete-profile
 */
export const completeProfile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.tempUser) {
            sendError(res, 'Unauthorized', 401);
            return;
        }

        const result = await authService.completeProfile(
            req.tempUser.userId,
            req.body
        );

        sendSuccess(
            res,
            'Profile completed successfully. Welcome to Prejamb!',
            {
                accessToken: result.tokens.accessToken,
                refreshToken: result.tokens.refreshToken,
                user: result.user,
            }
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Login user
 * POST /api/v1/auth/login
 */
export const login = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const result = await authService.loginUser(req.body);
        sendSuccess(res, 'Login successful', {
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
            user: result.user,
        });
    } catch (error) {
        if (error instanceof Error) {
            const err = error as Error & {
                tempToken?: string;
                requiresProfileCompletion?: boolean;
            };

            if (err.requiresProfileCompletion) {
                sendError(
                    res,
                    'Please complete your profile',
                    400,
                    { tempToken: [err.tempToken || ''] }
                );
                return;
            }
            sendError(res, error.message, 401);
            return;
        }
        next(error);
    }
};

/**
 * Refresh access token
 * POST /api/v1/auth/refresh-token
 */
export const refreshToken = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const result = await authService.refreshAccessToken(req.body.refreshToken);
        sendSuccess(res, 'Token refreshed successfully', result);
    } catch (error) {
        if (error instanceof Error) {
            sendError(res, error.message, 401);
            return;
        }
        next(error);
    }
};

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
export const logout = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await authService.logoutUser(refreshToken);
        }
        sendSuccess(res, 'Logged out successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Forgot password - request reset OTP
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        await authService.forgotPassword(req.body.email);
        // Always show success to prevent email enumeration
        sendSuccess(
            res,
            'If an account exists with this email, you will receive a password reset OTP.'
        );
    } catch (error) {
        if (error instanceof Error && error.message.includes('wait')) {
            sendError(res, error.message, 429);
            return;
        }
        // Don't reveal if user exists
        sendSuccess(
            res,
            'If an account exists with this email, you will receive a password reset OTP.'
        );
    }
};

/**
 * Reset password with OTP
 * POST /api/v1/auth/reset-password
 */
export const resetPassword = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        await authService.resetPassword(req.body);
        sendSuccess(res, 'Password reset successfully. Please login with your new password.');
    } catch (error) {
        if (error instanceof Error) {
            const err = error as Error & { attemptsRemaining?: number };
            if (err.attemptsRemaining !== undefined) {
                sendError(
                    res,
                    `${error.message} ${err.attemptsRemaining} attempts remaining.`,
                    400
                );
                return;
            }
            sendError(res, error.message, 400);
            return;
        }
        next(error);
    }
};

/**
 * Get current user profile
 * GET /api/v1/auth/me
 */
export const getMe = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'Unauthorized', 401);
            return;
        }

        const profile = await authService.getUserProfile(req.user.id);
        sendSuccess(res, 'Profile retrieved successfully', profile);
    } catch (error) {
        next(error);
    }
};
