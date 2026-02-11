import { Subscription, Payment, ISubscription, PlanType, PaymentMethod, User } from '../models';
import crypto from 'crypto';

// ─── Plan Configuration ───────────────────────────────────────────────────────
// Each paid plan has an associated Paystack Plan Code created on the Paystack dashboard.
// The plan code is sent to Paystack during transaction initialization so that
// Paystack knows which plan the customer is subscribing to.

export const PLAN_CONFIG: Record<string, {
    name: string;
    amount: number;
    durationDays: number;
    examModes: string[];
    maxTrials: number | null;
    tier: number;
    paystackPlanCode: string | null; // null for FREE plan
}> = {
    FREE: {
        name: 'Free Plan',
        amount: 0,
        durationDays: 0,
        examModes: ['PURE_JAMB', 'JAMB_AI'],
        maxTrials: 2,
        tier: 0,
        paystackPlanCode: null,
    },
    STARTER: {
        name: 'Starter Plan',
        amount: 500,
        durationDays: 30,
        examModes: ['PURE_JAMB', 'JAMB_AI'],
        maxTrials: null,
        tier: 1,
        paystackPlanCode: 'PLN_tc7124mko6gjmuj',
    },
    STANDARD: {
        name: 'Standard Plan',
        amount: 1000,
        durationDays: 30,
        examModes: ['PURE_JAMB', 'JAMB_AI', 'SINGLE_SUBJECT'],
        maxTrials: null,
        tier: 2,
        paystackPlanCode: 'PLN_q62tai9tprye3bm',
    },
    ANNUAL: {
        name: 'Annual Plan',
        amount: 10000,
        durationDays: 365,
        examModes: ['PURE_JAMB', 'JAMB_AI', 'SINGLE_SUBJECT'],
        maxTrials: null,
        tier: 3,
        paystackPlanCode: 'PLN_ihu5gc5pa3paww2',
    },
};

// ─── Paystack Integration ─────────────────────────────────────────────────────

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

/**
 * Initialize a Paystack transaction for a specific plan.
 *
 * KEY FIX: We send the `plan` field (Paystack Plan Code) in the request body.
 * Paystack requires this to correctly generate the authorization_url.
 * Without it, Paystack may return a response without authorization_url.
 *
 * We also explicitly validate that `data.data.authorization_url` exists
 * in the response before returning, to catch the "URL missing" error early.
 */
const initializePaystackTransaction = async (
    email: string,
    amountInKobo: number,
    reference: string,
    planCode: string,
    callbackUrl: string,
    metadata: Record<string, any> = {}
): Promise<{ authorization_url: string; access_code: string; reference: string }> => {
    if (!PAYSTACK_SECRET_KEY) {
        throw new Error(
            'Paystack secret key is not configured. Please add PAYSTACK_SECRET_KEY to your .env file.'
        );
    }

    // Build the request body exactly as Paystack expects
    const body = {
        email,
        amount: amountInKobo,
        reference,
        plan: planCode,
        callback_url: callbackUrl, // Strict requirement: Explicitly include callback_url
        metadata,
    };

    // Log the full request body for verification (masking sensitive data if any)
    console.log('[Paystack] Initializing transaction with Payload:', JSON.stringify(body, null, 2));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
        const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const rawText = await response.text();
        console.log('[Paystack] Raw response:', rawText);

        let jsonResponse: any;
        try {
            jsonResponse = JSON.parse(rawText);
        } catch {
            throw new Error(`Paystack returned invalid JSON: ${rawText.substring(0, 200)}`);
        }

        // Check if Paystack returned status: false
        if (!jsonResponse.status) {
            console.error('[Paystack] Transaction initialization failed:', jsonResponse.message);
            throw new Error(`Paystack error: ${jsonResponse.message || 'Transaction initialization failed'}`);
        }

        // CRITICAL: Extract authorization_url from data object
        const authorizationUrl = jsonResponse.data?.authorization_url;
        const accessCode = jsonResponse.data?.access_code;
        const returnedReference = jsonResponse.data?.reference;

        if (!authorizationUrl) {
            console.error('[Paystack] authorization_url is missing from response:', JSON.stringify(jsonResponse));
            throw new Error(
                'Payment initialized but authorization_url is missing from Paystack response. ' +
                'This usually means the plan code is invalid or the amount does not match the plan.'
            );
        }

        console.log('[Paystack] Success! authorization_url:', authorizationUrl);

        return {
            authorization_url: authorizationUrl,
            access_code: accessCode || '',
            reference: returnedReference || reference,
        };
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Paystack request timed out after 30 seconds. Please try again.');
        }
        throw error;
    }
};

/**
 * Verify a Paystack transaction by reference.
 */
const verifyPaystackTransaction = async (
    reference: string
): Promise<{ status: string; amount: number; reference: string; gateway_response: string }> => {
    if (!PAYSTACK_SECRET_KEY) {
        throw new Error(
            'Paystack secret key is not configured. Please add PAYSTACK_SECRET_KEY to your .env file.'
        );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(
            `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
            }
        );

        clearTimeout(timeoutId);

        const rawText = await response.text();
        let jsonResponse: any;
        try {
            jsonResponse = JSON.parse(rawText);
        } catch {
            throw new Error(`Paystack returned invalid JSON during verification: ${rawText.substring(0, 200)}`);
        }

        if (!jsonResponse.status) {
            throw new Error(`Paystack verification error: ${jsonResponse.message || 'Failed to verify transaction'}`);
        }

        return jsonResponse.data;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Paystack verification request timed out after 30 seconds.');
        }
        throw error;
    }
};

// ─── Plan Utilities ───────────────────────────────────────────────────────────

export const isDowngrade = (currentPlan: PlanType, targetPlan: PlanType): boolean => {
    const currentTier = PLAN_CONFIG[currentPlan]?.tier ?? 0;
    const targetTier = PLAN_CONFIG[targetPlan]?.tier ?? 0;
    return targetTier < currentTier;
};

export const getUpgradeOptions = (currentPlan: PlanType): PlanType[] => {
    const currentTier = PLAN_CONFIG[currentPlan]?.tier ?? 0;
    return (Object.keys(PLAN_CONFIG) as PlanType[]).filter(
        (plan) => PLAN_CONFIG[plan].tier > currentTier
    );
};

export const getAvailablePlans = () => {
    return Object.entries(PLAN_CONFIG).map(([key, value]) => ({
        planType: key,
        name: value.name,
        amount: value.amount,
        durationDays: key === 'FREE' ? null : value.durationDays,
        validFor: key === 'FREE' ? null : value.durationDays,
        examModes: value.examModes,
        features: {
            pureJamb: value.examModes.includes('PURE_JAMB'),
            jambAI: value.examModes.includes('JAMB_AI'),
            singleSubject: value.examModes.includes('SINGLE_SUBJECT'),
        },
    }));
};

export const getPlanDetails = (planType: PlanType) => {
    const config = PLAN_CONFIG[planType];
    if (!config) {
        throw new Error('Invalid plan type');
    }
    return {
        planType,
        name: config.name,
        amount: config.amount,
        validFor: planType === 'FREE' ? null : config.durationDays,
        durationDays: config.durationDays,
        examModes: config.examModes,
    };
};

// ─── Subscription Management ──────────────────────────────────────────────────

/**
 * Get user's current active subscription (raw query, may return null)
 */
export const getUserActiveSubscription = async (userId: string): Promise<ISubscription | null> => {
    // Deactivate any expired paid subscriptions
    await Subscription.updateMany(
        { userId, isActive: true, endDate: { $lte: new Date() }, planType: { $ne: 'FREE' } },
        { isActive: false }
    );

    const subscription = await Subscription.findOne({
        userId,
        isActive: true,
    }).sort({ createdAt: -1 });

    // Double-check: if paid plan is expired, deactivate it
    if (subscription && subscription.planType !== 'FREE' && subscription.endDate <= new Date()) {
        subscription.isActive = false;
        await subscription.save();
        return null;
    }

    return subscription;
};

/**
 * Create a free subscription for user (new user or fallback after expiry)
 */
export const createFreeSubscription = async (userId: string): Promise<ISubscription> => {
    const existing = await getUserActiveSubscription(userId);
    if (existing) return existing;

    // Inherit freeTrialsUsed from previous free subscription
    const lastFree = await Subscription.findOne({ userId, planType: 'FREE' }).sort({ createdAt: -1 });
    const freeTrialsUsed = lastFree ? lastFree.freeTrialsUsed : [];

    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 100); // Free plan never expires

    const subscription = await Subscription.create({
        userId,
        planType: 'FREE',
        amount: 0,
        startDate,
        endDate,
        isActive: true,
        freeTrialsUsed,
    });

    await User.findByIdAndUpdate(userId, {
        subscriptionStatus: 'ACTIVE',
        subscriptionPlan: 'FREE',
        subscriptionEndDate: endDate,
    });

    return subscription;
};

/**
 * Ensure user always has an active subscription.
 * If no active subscription exists, fallback to free plan.
 */
export const ensureActiveSubscription = async (userId: string): Promise<ISubscription> => {
    const subscription = await getUserActiveSubscription(userId);
    if (subscription) return subscription;
    return await createFreeSubscription(userId);
};

// ─── Exam Access ──────────────────────────────────────────────────────────────

export const canAccessExamMode = async (
    userId: string,
    examMode: string
): Promise<{ canAccess: boolean; reason?: string }> => {
    const subscription = await ensureActiveSubscription(userId);
    const config = PLAN_CONFIG[subscription.planType];

    if (!config.examModes.includes(examMode as any)) {
        return {
            canAccess: false,
            reason: `${examMode} mode is not available in ${config.name}. Please upgrade your plan.`,
        };
    }

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

export const markFreeTrialUsed = async (userId: string, examMode: string): Promise<void> => {
    const subscription = await ensureActiveSubscription(userId);
    if (subscription.planType !== 'FREE') return;

    if (!subscription.freeTrialsUsed.includes(examMode as any)) {
        subscription.freeTrialsUsed.push(examMode as any);
        await subscription.save();
    }
};

// ─── Payment & Activation ─────────────────────────────────────────────────────

/**
 * Initialize payment for subscription upgrade via Paystack.
 *
 * For FREE plan: No Paystack call. Immediately activate subscription.
 * For paid plans: Send plan code + amount + email to Paystack, get authorization_url back.
 */
export const initializePayment = async (
    userId: string,
    planType: PlanType,
    paymentMethod: PaymentMethod
): Promise<{
    paymentReference: string;
    amount: number;
    plan: any;
    authorizationUrl: string;
    authorization_url: string;
    accessCode: string;
    access_code: string;
}> => {
    // ── FREE plan: activate immediately, no Paystack ──
    if (planType === 'FREE') {
        const subscription = await createFreeSubscription(userId);
        return {
            paymentReference: 'FREE',
            amount: 0,
            plan: getPlanDetails('FREE'),
            authorizationUrl: '',
            authorization_url: '',
            accessCode: '',
            access_code: '',
        };
    }

    const config = PLAN_CONFIG[planType];
    if (!config) {
        throw new Error('Invalid plan type');
    }

    if (!config.paystackPlanCode) {
        throw new Error(`No Paystack plan code configured for ${config.name}`);
    }

    // Check for downgrade
    const currentSubscription = await ensureActiveSubscription(userId);
    if (currentSubscription.planType !== 'FREE') {
        if (isDowngrade(currentSubscription.planType, planType)) {
            throw new Error(
                `Cannot downgrade from ${PLAN_CONFIG[currentSubscription.planType].name} to ${config.name}. ` +
                `You can only upgrade to a higher plan. Your current subscription must expire before you can choose a different plan.`
            );
        }
    }

    // Get user email for Paystack
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    // Generate unique payment reference
    const paymentReference = `PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Callback URL (after payment, Paystack redirects here)
    // Paystack automatically appends ?reference=... to this URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const callbackUrl = `${frontendUrl}/subscription`;

    // Convert amount to kobo (Naira * 100)
    const amountInKobo = Math.round(config.amount * 100);

    // Initialize Paystack transaction with plan code
    const paystackResult = await initializePaystackTransaction(
        user.email,
        amountInKobo,
        paymentReference,
        config.paystackPlanCode,  // <-- The Paystack Plan Code
        callbackUrl,
        {
            userId,
            planType,
            paymentMethod,
            custom_fields: [
                { display_name: 'Plan', variable_name: 'plan', value: config.name },
                { display_name: 'Duration', variable_name: 'duration', value: `${config.durationDays} days` },
            ],
        }
    );

    // Create payment record
    await Payment.create({
        userId,
        amount: config.amount,
        planType,
        paymentMethod,
        paymentReference,
        paymentGatewayReference: paystackResult.access_code,
        status: 'PENDING',
        metadata: {
            accessCode: paystackResult.access_code,
            authorizationUrl: paystackResult.authorization_url,
            paystackPlanCode: config.paystackPlanCode,
        },
    });

    console.log('[Payment] Initialized successfully:', {
        paymentReference,
        authorization_url: paystackResult.authorization_url,
        planType,
        amount: config.amount,
    });

    return {
        paymentReference,
        amount: config.amount,
        plan: getPlanDetails(planType),
        authorizationUrl: paystackResult.authorization_url,
        authorization_url: paystackResult.authorization_url,
        accessCode: paystackResult.access_code,
        access_code: paystackResult.access_code,
    };
};

/**
 * Verify payment with Paystack and activate subscription.
 * Called after user completes payment on Paystack checkout page.
 */
export const verifyAndActivateSubscription = async (
    paymentReference: string
): Promise<{ subscription: ISubscription; payment: any }> => {
    const payment = await Payment.findOne({ paymentReference });
    if (!payment) {
        throw new Error('Payment not found');
    }

    if (payment.status === 'SUCCESS') {
        throw new Error('Payment already processed');
    }

    // Verify with Paystack
    const paystackData = await verifyPaystackTransaction(paymentReference);

    if (paystackData.status !== 'success') {
        payment.status = 'FAILED';
        await payment.save();
        throw new Error(`Payment verification failed: ${paystackData.gateway_response}`);
    }

    // Verify amount matches (Paystack returns amount in kobo)
    const expectedAmountKobo = payment.amount * 100;
    if (paystackData.amount !== expectedAmountKobo) {
        payment.status = 'FAILED';
        await payment.save();
        throw new Error('Payment amount mismatch');
    }

    // Atomic update to prevent double-processing (race condition guard)
    const updatedPayment = await Payment.findOneAndUpdate(
        { _id: payment._id, status: 'PENDING' },
        {
            status: 'SUCCESS',
            paidAt: new Date(),
            paymentGatewayReference: paystackData.reference,
        },
        { new: true }
    );

    if (!updatedPayment) {
        const existingPayment = await Payment.findById(payment._id);
        if (existingPayment?.status === 'SUCCESS') {
            const existingSub = await Subscription.findById(existingPayment.subscriptionId);
            if (existingSub) {
                return { subscription: existingSub, payment: existingPayment };
            }
        }
        throw new Error('Payment already processed or status transition failed');
    }

    // Grant the subscription
    try {
        // Deactivate any existing active subscriptions
        await Subscription.updateMany(
            { userId: payment.userId, isActive: true },
            { isActive: false }
        );

        // Create new subscription with correct dates
        const config = PLAN_CONFIG[payment.planType as PlanType];
        const startDate = new Date();
        const endDate = new Date(startDate);
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
        updatedPayment.subscriptionId = subscription._id;
        await updatedPayment.save();

        // Update User model
        await User.findByIdAndUpdate(payment.userId, {
            subscriptionStatus: 'ACTIVE',
            subscriptionPlan: payment.planType, // Update to 'STARTER', 'STANDARD', or 'ANNUAL'
            subscriptionEndDate: endDate,
        });

        console.log('[Payment] Verified and subscription activated:', {
            planType: payment.planType,
            startDate,
            endDate,
            paymentReference,
        });

        return { subscription, payment: updatedPayment };
    } catch (error) {
        throw new Error(
            `Failed to activate subscription after payment: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
};

// ─── Subscription Status ──────────────────────────────────────────────────────

/**
 * Get full subscription status.
 *
 * Response fields:
 * - createdAt:      when the subscription record was created (Date created)
 * - startDate:      the date the user subscribed to the plan (Start date)
 * - endDate:        startDate + durationDays (End date — when the plan expires)
 * - validFor:       30 for Starter/Standard, 365 for Annual, null for Free
 * - daysLeft:       dynamic countdown from now to endDate (0 when expired)
 * - dateActivated:  same as startDate (alias for clarity)
 *
 * For FREE plan: endDate, daysLeft, validFor are null (no expiry concept).
 */
export const getSubscriptionStatus = async (userId: string) => {
    const subscription = await ensureActiveSubscription(userId);
    const config = PLAN_CONFIG[subscription.planType];

    // Calculate dynamic days remaining
    let daysLeft = 0;
    if (subscription.planType !== 'FREE') {
        const msRemaining = subscription.endDate.getTime() - Date.now();
        daysLeft = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
    }

    const isFree = subscription.planType === 'FREE';

    return {
        status: 'ACTIVE',
        currentPlan: {
            planType: subscription.planType,
            name: config.name,
            amount: subscription.amount,
            createdAt: subscription.createdAt,
            startDate: subscription.startDate,
            endDate: isFree ? null : subscription.endDate,
            dateActivated: subscription.startDate,
            validFor: isFree ? null : config.durationDays,
            daysLeft: isFree ? null : daysLeft,
            freeTrialsUsed: subscription.freeTrialsUsed,
            freeTrialsRemaining: isFree
                ? config.maxTrials! - subscription.freeTrialsUsed.length
                : null,
            examModes: config.examModes,
        },
    };
};
