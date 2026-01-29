import { Request, Response, NextFunction } from 'express';
import { sendServerError, sendError } from '../utils/response.utils';
import { config } from '../config/environment';

// Custom error class for API errors
export class ApiError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
    err: Error | ApiError,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction
): void => {
    // Log error in development
    if (config.nodeEnv === 'development') {
        console.error('❌ Error:', err);
    }

    // Handle known API errors
    if (err instanceof ApiError) {
        sendError(res, err.message, err.statusCode);
        return;
    }

    // Handle specific error types
    if (err.name === 'JsonWebTokenError') {
        sendError(res, 'Invalid token', 401);
        return;
    }

    if (err.name === 'TokenExpiredError') {
        sendError(res, 'Token expired', 401);
        return;
    }

    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
        sendError(res, 'Validation error occurred', 400);
        return;
    }

    // Handle Mongoose CastError (invalid ObjectId)
    if (err.name === 'CastError') {
        sendError(res, 'Invalid ID format', 400);
        return;
    }

    // Handle MongoDB duplicate key error
    if (err.name === 'MongoServerError' && (err as Error & { code?: number }).code === 11000) {
        sendError(res, 'Duplicate entry found', 409);
        return;
    }

    // Handle MongoDB connection errors
    if (err.name === 'MongoNetworkError') {
        sendError(res, 'Database connection error', 503);
        return;
    }

    // Default to 500 server error
    sendServerError(
        res,
        config.nodeEnv === 'production'
            ? 'An unexpected error occurred'
            : err.message
    );
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction
): void => {
    sendError(res, `Route ${req.method} ${req.originalUrl} not found`, 404);
};
