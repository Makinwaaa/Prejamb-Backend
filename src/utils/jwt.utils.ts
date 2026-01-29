import jwt, { Secret } from 'jsonwebtoken';
import { config } from '../config/environment';

interface TokenPayload {
    userId: string;
    email: string;
    type?: 'access' | 'refresh' | 'temp';
}

interface TempTokenPayload {
    userId: string;
    email: string;
    type: 'email_verification' | 'profile_completion';
}

/**
 * Generate an access token (short-lived)
 */
export const generateAccessToken = (userId: string, email: string): string => {
    const payload: TokenPayload = { userId, email, type: 'access' };
    const secret: Secret = config.jwt.accessSecret;
    return jwt.sign(payload, secret, {
        expiresIn: config.jwt.accessExpiresIn,
    } as jwt.SignOptions);
};

/**
 * Generate a refresh token (long-lived)
 */
export const generateRefreshToken = (userId: string, email: string): string => {
    const payload: TokenPayload = { userId, email, type: 'refresh' };
    const secret: Secret = config.jwt.refreshSecret;
    return jwt.sign(payload, secret, {
        expiresIn: config.jwt.refreshExpiresIn,
    } as jwt.SignOptions);
};

/**
 * Generate a temporary token for profile completion flow
 */
export const generateTempToken = (
    userId: string,
    email: string,
    type: 'email_verification' | 'profile_completion'
): string => {
    const payload: TempTokenPayload = { userId, email, type };
    const secret: Secret = config.jwt.accessSecret;
    return jwt.sign(payload, secret, {
        expiresIn: '30m',
    } as jwt.SignOptions);
};

/**
 * Verify and decode an access token
 */
export const verifyAccessToken = (token: string): TokenPayload | null => {
    try {
        const decoded = jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
        return decoded;
    } catch {
        return null;
    }
};

/**
 * Verify and decode a refresh token
 */
export const verifyRefreshToken = (token: string): TokenPayload | null => {
    try {
        const decoded = jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
        return decoded;
    } catch {
        return null;
    }
};

/**
 * Verify and decode a temp token
 */
export const verifyTempToken = (token: string): TempTokenPayload | null => {
    try {
        const decoded = jwt.verify(token, config.jwt.accessSecret) as TempTokenPayload;
        if (decoded.type === 'email_verification' || decoded.type === 'profile_completion') {
            return decoded;
        }
        return null;
    } catch {
        return null;
    }
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7);
};
