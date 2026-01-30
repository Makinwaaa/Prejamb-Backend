import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response.utils';
import * as subscriptionService from '../services/subscription.service';

/**
 * Get all available plans
 * GET /api/v1/subscription/plans
 */
export const getPlans = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const plans = subscriptionService.getAvailablePlans();
        sendSuccess(res, 'Plans retrieved successfully', { plans });
    } catch (error) {
        next(error);
    }
};

/**
 * Get user's current subscription
 * GET /api/v1/subscription/current
 */
export const getCurrentSubscription = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'Unauthorized', 401);
            return;
        }

        const status = await subscriptionService.getSubscriptionStatus(req.user.id);
        sendSuccess(res, 'Subscription status retrieved successfully', status);
    } catch (error) {
        next(error);
    }
};

/**
 * Initialize payment for subscription upgrade
 * POST /api/v1/subscription/initialize-payment
 */
export const initializePayment = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'Unauthorized', 401);
            return;
        }

        const { planType, paymentMethod } = req.body;
        const result = await subscriptionService.initializePayment(
            req.user.id,
            planType,
            paymentMethod
        );

        sendSuccess(res, 'Payment initialized successfully', result);
    } catch (error) {
        if (error instanceof Error) {
            sendError(res, error.message, 400);
            return;
        }
        next(error);
    }
};

/**
 * Verify payment and activate subscription
 * POST /api/v1/subscription/verify-payment
 */
export const verifyPayment = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { paymentReference, paymentGatewayReference } = req.body;

        const result = await subscriptionService.verifyAndActivateSubscription(
            paymentReference,
            paymentGatewayReference
        );

        sendSuccess(res, 'Payment verified and subscription activated successfully', {
            subscription: {
                planType: result.subscription.planType,
                startDate: result.subscription.startDate,
                endDate: result.subscription.endDate,
                isActive: result.subscription.isActive,
            },
        });
    } catch (error) {
        if (error instanceof Error) {
            sendError(res, error.message, 400);
            return;
        }
        next(error);
    }
};

/**
 * Check exam mode access
 * POST /api/v1/subscription/check-access
 */
export const checkExamModeAccess = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'Unauthorized', 401);
            return;
        }

        const { examMode } = req.body;
        const result = await subscriptionService.canAccessExamMode(req.user.id, examMode);

        if (!result.canAccess) {
            sendError(res, result.reason || 'Access denied', 403);
            return;
        }

        sendSuccess(res, 'Access granted', { canAccess: true });
    } catch (error) {
        next(error);
    }
};

/**
 * Mark free trial as used (called when exam is started)
 * POST /api/v1/subscription/use-trial
 */
export const useTrial = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'Unauthorized', 401);
            return;
        }

        const { examMode } = req.body;
        await subscriptionService.markFreeTrialUsed(req.user.id, examMode);

        sendSuccess(res, 'Trial marked as used');
    } catch (error) {
        next(error);
    }
};

/**
 * Cancel subscription
 * POST /api/v1/subscription/cancel
 */
export const cancelSubscription = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 'Unauthorized', 401);
            return;
        }

        await subscriptionService.cancelSubscription(req.user.id);
        sendSuccess(res, 'Subscription cancelled successfully');
    } catch (error) {
        next(error);
    }
};
