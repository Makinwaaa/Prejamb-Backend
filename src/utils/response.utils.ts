import { Response } from 'express';
import { ApiResponse } from '../types';

/**
 * Send a success response
 */
export const sendSuccess = <T>(
    res: Response,
    message: string,
    data?: T,
    statusCode = 200
): void => {
    const response: ApiResponse<T> = {
        success: true,
        message,
        data,
    };
    res.status(statusCode).json(response);
};

/**
 * Send an error response
 */
export const sendError = (
    res: Response,
    message: string,
    statusCode = 400,
    errors?: Record<string, string[]>
): void => {
    const response: ApiResponse = {
        success: false,
        message,
        errors,
    };
    res.status(statusCode).json(response);
};

/**
 * Send a validation error response
 */
export const sendValidationError = (
    res: Response,
    errors: Record<string, string[]>
): void => {
    sendError(res, 'Validation failed', 400, errors);
};

/**
 * Send an unauthorized response
 */
export const sendUnauthorized = (
    res: Response,
    message = 'Unauthorized'
): void => {
    sendError(res, message, 401);
};

/**
 * Send a forbidden response
 */
export const sendForbidden = (
    res: Response,
    message = 'Forbidden'
): void => {
    sendError(res, message, 403);
};

/**
 * Send a not found response
 */
export const sendNotFound = (
    res: Response,
    message = 'Resource not found'
): void => {
    sendError(res, message, 404);
};

/**
 * Send a conflict response
 */
export const sendConflict = (
    res: Response,
    message = 'Resource already exists'
): void => {
    sendError(res, message, 409);
};

/**
 * Send a server error response
 */
export const sendServerError = (
    res: Response,
    message = 'Internal server error'
): void => {
    sendError(res, message, 500);
};

/**
 * Send a rate limit exceeded response
 */
export const sendRateLimitExceeded = (
    res: Response,
    message = 'Too many requests, please try again later'
): void => {
    sendError(res, message, 429);
};
