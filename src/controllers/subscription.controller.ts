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
 * Get available upgrade options for current subscription
 * GET /api/v1/subscription/upgrade-options
 */
export const getUpgradeOptions = async (
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
        const currentPlan = status.currentPlan?.planType || 'FREE';
        const upgradeOptions = subscriptionService.getUpgradeOptions(currentPlan as any);

        // Get plan details for each upgrade option
        const plans = subscriptionService.getAvailablePlans();
        const availableUpgrades = plans.filter(plan => upgradeOptions.includes(plan.planType as any));

        sendSuccess(res, 'Upgrade options retrieved successfully', {
            currentPlan,
            canDowngrade: false,
            upgradeOptions: availableUpgrades,
            message: currentPlan === 'FREE'
                ? 'You can choose any paid plan'
                : 'You can only upgrade to a higher tier plan. Wait for your subscription to expire to choose any plan.',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Initialize payment for subscription upgrade
 * POST /api/v1/subscription/initialize-payment
 *
 * For FREE plan: Immediately activates, returns success with no redirect URL.
 * For paid plans: Returns Paystack authorization_url for user redirect.
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

        // Handle FREE plan: immediate activation, no payment needed
        if (planType === 'FREE') {
            const result = await subscriptionService.initializePayment(
                req.user.id,
                planType,
                paymentMethod || 'CARD'
            );
            sendSuccess(res, 'Free plan activated successfully', {
                paymentReference: 'FREE',
                amount: 0,
                plan: result.plan,
                authorizationUrl: null,
                authorization_url: null,
                accessCode: null,
                access_code: null,
                reference: 'FREE',
                redirectRequired: false,
            });
            return;
        }

        // Paid plans: call Paystack
        const result = await subscriptionService.initializePayment(
            req.user.id,
            planType,
            paymentMethod
        );

        // Ensure authorization_url is present
        if (!result.authorization_url) {
            sendError(res, 'Payment initialized but URL missing. Please check Paystack plan configuration.', 500);
            return;
        }

        sendSuccess(res, 'Payment initialized successfully. Redirect user to authorization_url.', {
            paymentReference: result.paymentReference,
            amount: result.amount,
            plan: result.plan,
            authorizationUrl: result.authorization_url,
            authorization_url: result.authorization_url,
            accessCode: result.access_code,
            access_code: result.access_code,
            reference: result.paymentReference,
            redirectRequired: true,
        });
    } catch (error) {
        if (error instanceof Error) {
            console.error('[initializePayment] Error:', error.message);
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
        const { paymentReference } = req.body;

        const result = await subscriptionService.verifyAndActivateSubscription(
            paymentReference
        );

        const config = subscriptionService.PLAN_CONFIG[result.subscription.planType];
        const daysLeft = Math.max(0, Math.ceil(
            (result.subscription.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ));

        sendSuccess(res, 'Payment verified and subscription activated successfully', {
            subscription: {
                planType: result.subscription.planType,
                name: config.name,
                dateActivated: result.subscription.startDate,
                createdAt: result.subscription.createdAt,
                validFor: config.durationDays,
                startDate: result.subscription.startDate,
                endDate: result.subscription.endDate,
                daysLeft,
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
