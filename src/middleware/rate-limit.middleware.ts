import rateLimit from 'express-rate-limit';
import { config } from '../config/environment';
import { sendRateLimitExceeded } from '../utils/response.utils';
import { Response } from 'express';

/**
 * General rate limiter for all routes
 */
export const generalLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs, // 15 minutes
    max: config.rateLimit.maxRequests, // 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res: Response) => {
        sendRateLimitExceeded(res);
    },
});

/**
 * Strict rate limiter for authentication routes
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res: Response) => {
        sendRateLimitExceeded(
            res,
            'Too many authentication attempts, please try again in 15 minutes'
        );
    },
    skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Very strict rate limiter for OTP resend
 */
export const otpResendLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 1, // 1 request per minute
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res: Response) => {
        sendRateLimitExceeded(
            res,
            'Please wait 60 seconds before requesting a new OTP'
        );
    },
});

/**
 * Rate limiter for password reset
 */
export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 attempts per hour
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res: Response) => {
        sendRateLimitExceeded(
            res,
            'Too many password reset attempts, please try again in 1 hour'
        );
    },
});
