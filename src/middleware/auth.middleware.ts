import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { User } from '../models';
import {
    verifyAccessToken,
    verifyTempToken,
    extractTokenFromHeader,
} from '../utils/jwt.utils';
import { sendUnauthorized, sendForbidden } from '../utils/response.utils';

/**
 * Authenticate user with access token
 * Adds user to request object if valid
 */
export const authenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = extractTokenFromHeader(req.headers.authorization);

        if (!token) {
            sendUnauthorized(res, 'Access token required');
            return;
        }

        const payload = verifyAccessToken(token);

        if (!payload) {
            sendUnauthorized(res, 'Invalid or expired access token');
            return;
        }

        // Get user from database
        const user = await User.findById(payload.userId);

        if (!user) {
            sendUnauthorized(res, 'User not found');
            return;
        }

        // Add user to request
        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Authenticate with temporary token for profile completion
 */
export const authenticateTempToken = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = extractTokenFromHeader(req.headers.authorization);

        if (!token) {
            sendUnauthorized(res, 'Temporary token required');
            return;
        }

        const payload = verifyTempToken(token);

        if (!payload) {
            sendUnauthorized(res, 'Invalid or expired temporary token');
            return;
        }

        if (payload.type !== 'profile_completion') {
            sendForbidden(res, 'Invalid token type for this operation');
            return;
        }

        // Verify user exists and is verified
        const user = await User.findById(payload.userId);

        if (!user) {
            sendUnauthorized(res, 'User not found');
            return;
        }

        if (!user.isVerified) {
            sendForbidden(res, 'Email not verified');
            return;
        }

        // Add temp user info to request
        req.tempUser = {
            userId: payload.userId,
            email: payload.email,
            type: payload.type,
        };

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = extractTokenFromHeader(req.headers.authorization);

        if (token) {
            const payload = verifyAccessToken(token);

            if (payload) {
                const user = await User.findById(payload.userId);

                if (user) {
                    req.user = user;
                }
            }
        }

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Require profile to be complete
 */
export const requireCompleteProfile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    if (!req.user?.isProfileComplete) {
        sendForbidden(res, 'Please complete your profile first');
        return;
    }
    next();
};
