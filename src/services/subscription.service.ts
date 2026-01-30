import { Subscription, Payment, ISubscription, PlanType, PaymentMethod, User } from '../models';
import crypto from 'crypto';

// Plan configuration
export const PLAN_CONFIG = {
    FREE: {
        name: 'Free Plan',
        amount: 0,
        durationDays: 999999, // Essentially unlimited for free
        examModes: ['PURE_JAMB', 'JAMB_AI'],
        maxTrials: 2, // One trial per mode
    },
    STARTER: {
        name: 'Starter Plan',
        amount: 500,
        durationDays: 30,
        examModes: ['PURE_JAMB', 'JAMB_AI'],
        maxTrials: null, // Unlimited during subscription period
    },
    STANDARD: {
        name: 'Standard Plan',
        amount: 1000,
        durationDays: 30,
        examModes: ['PURE_JAMB', 'JAMB_AI', 'SINGLE_SUBJECT'],
        maxTrials: null,
    },
    ANNUAL: {
        name: 'Annual Plan',
        amount: 10000,
        durationDays: 365,
        examModes: ['PURE_JAMB', 'JAMB_AI', 'SINGLE_SUBJECT'],
        maxTrials: null,
    },
};

/**
 * Get all available plans
 */
export const getAvailablePlans = () => {
    return Object.entries(PLAN_CONFIG).map(([key, value]) => ({
        planType: key,
        name: value.name,
        amount: value.amount,
        durationDays: key === 'FREE' ? null : value.durationDays,
        validity: key === 'FREE' ? 'Lifetime' : `${value.durationDays} days`,
        examModes: value.examModes,
        features: {
            pureJamb: value.examModes.includes('PURE_JAMB'),
            jambAI: value.examModes.includes('JAMB_AI'),
            singleSubject: value.examModes.includes('SINGLE_SUBJECT'),
        },
    }));
};

/**
 * Get plan details by plan type
 */
export const getPlanDetails = (planType: PlanType) => {
    const config = PLAN_CONFIG[planType];
    if (!config) {
        throw new Error('Invalid plan type');
    }

    return {
        planType,
        name: config.name,
        amount: config.amount,
        validity: planType === 'FREE' ? 'Lifetime' : `${config.durationDays} days`,
        durationDays: config.durationDays,
        examModes: config.examModes,
    };
};

/**
 * Get user's current active subscription
 */
export const getUserActiveSubscription = async (userId: string): Promise<ISubscription | null> => {
    const subscription = await Subscription.findOne({
        userId,
        isActive: true,
        endDate: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    return subscription;
};

/**
 * Create free subscription for new user
 */
export const createFreeSubscription = async (userId: string): Promise<ISubscription | null> => {
    // Check if user already has an active subscription to avoid duplicates
    const existing = await getUserActiveSubscription(userId);
    if (existing) return existing;

    // Check user eligibility
    const user = await User.findById(userId);
    if (!user || user.subscriptionStatus !== 'ACTIVE') {
        return null;
    }

    const config = PLAN_CONFIG.FREE;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + config.durationDays);

    const subscription = await Subscription.create({
        userId,
        planType: 'FREE',
        amount: 0,
        startDate,
        endDate,
        isActive: true,
        freeTrialsUsed: [],
    });

    // Update User model status
    await User.findByIdAndUpdate(userId, {
        subscriptionStatus: 'ACTIVE',
        subscriptionEndDate: endDate,
    });

    return subscription;
};

/**
 * Check if user can access exam mode
 */
export const canAccessExamMode = async (
    userId: string,
    examMode: string
): Promise<{ canAccess: boolean; reason?: string }> => {
    const subscription = await getUserActiveSubscription(userId);

    if (!subscription) {
        return { canAccess: false, reason: 'No active subscription' };
    }

    const config = PLAN_CONFIG[subscription.planType];

    // Check if mode is available in this plan
    if (!config.examModes.includes(examMode as any)) {
        return {
            canAccess: false,
            reason: `${examMode} mode is not available in ${config.name}. Please upgrade your plan.`,
        };
    }

    // For FREE plan, check if trials are exhausted
    if (subscription.planType === 'FREE') {
        if (subscription.freeTrialsUsed.includes(examMode as any)) {
            return {
                canAccess: false,
                reason: 'Free trial for this mode has been used. Please upgrade to continue practicing.',
            };
        }
    }

    return { canAccess: true };
};

/**
 * Mark free trial as used
 */
export const markFreeTrialUsed = async (userId: string, examMode: string): Promise<void> => {
    const subscription = await getUserActiveSubscription(userId);

    if (!subscription || subscription.planType !== 'FREE') {
        return;
    }

    if (!subscription.freeTrialsUsed.includes(examMode as any)) {
        subscription.freeTrialsUsed.push(examMode as any);
        await subscription.save();
    }
};

/**
 * Initialize payment for subscription upgrade
 */
export const initializePayment = async (
    userId: string,
    planType: PlanType,
    paymentMethod: PaymentMethod
): Promise<{ paymentReference: string; amount: number; plan: any }> => {
    if (planType === 'FREE') {
        throw new Error('Cannot make payment for free plan');
    }

    const config = PLAN_CONFIG[planType];
    if (!config) {
        throw new Error('Invalid plan type');
    }

    // Generate unique payment reference
    const paymentReference = `PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Create payment record
    await Payment.create({
        userId,
        amount: config.amount,
        planType,
        paymentMethod,
        paymentReference,
        status: 'PENDING',
    });

    return {
        paymentReference,
        amount: config.amount,
        plan: getPlanDetails(planType),
    };
};

/**
 * Verify and activate subscription after payment
 */
export const verifyAndActivateSubscription = async (
    paymentReference: string,
    paymentGatewayReference?: string
): Promise<{ subscription: ISubscription; payment: any }> => {
    // Find payment record
    const payment = await Payment.findOne({ paymentReference });

    if (!payment) {
        throw new Error('Payment not found');
    }

    if (payment.status === 'SUCCESS') {
        throw new Error('Payment already processed');
    }

    // In a real scenario, verify with payment gateway here
    // For test mode, we'll simulate successful payment

    // Update payment status
    payment.status = 'SUCCESS';
    payment.paidAt = new Date();
    if (paymentGatewayReference) {
        payment.paymentGatewayReference = paymentGatewayReference;
    }
    await payment.save();

    // Deactivate any existing active subscriptions
    await Subscription.updateMany(
        { userId: payment.userId, isActive: true },
        { isActive: false }
    );

    // Create new subscription
    const config = PLAN_CONFIG[payment.planType as PlanType];
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + config.durationDays);

    const subscription = await Subscription.create({
        userId: payment.userId,
        planType: payment.planType,
        amount: payment.amount,
        startDate,
        endDate,
        isActive: true,
        paymentReference: payment.paymentReference,
        freeTrialsUsed: [],
    });

    // Link subscription to payment
    payment.subscriptionId = subscription._id;
    await payment.save();

    // Update User model status
    await User.findByIdAndUpdate(payment.userId, {
        subscriptionStatus: 'ACTIVE',
        subscriptionEndDate: endDate,
    });

    return { subscription, payment };
};

/**
 * Get subscription status for user
 */
export const getSubscriptionStatus = async (userId: string) => {
    const subscription = await getUserActiveSubscription(userId);

    if (!subscription) {
        return {
            status: 'INACTIVE',
            currentPlan: null,
            message: 'No active subscription',
        };
    }

    const config = PLAN_CONFIG[subscription.planType];
    const daysRemaining = Math.ceil(
        (subscription.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return {
        status: 'ACTIVE',
        currentPlan: {
            planType: subscription.planType,
            name: config.name,
            amount: subscription.amount,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            daysRemaining: subscription.planType === 'FREE' ? null : daysRemaining,
            freeTrialsUsed: subscription.freeTrialsUsed,
            freeTrialsRemaining:
                subscription.planType === 'FREE'
                    ? config.maxTrials! - subscription.freeTrialsUsed.length
                    : null,
            examModes: config.examModes,
        },
    };
};

/**
 * Cancel subscription (mark as inactive)
 */
export const cancelSubscription = async (userId: string): Promise<void> => {
    await Subscription.updateMany({ userId, isActive: true }, { isActive: false, autoRenew: false });

    // Update User model status
    await User.findByIdAndUpdate(userId, {
        subscriptionStatus: 'INACTIVE',
    });
};
