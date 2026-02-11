import { Router } from 'express';
import * as subscriptionController from '../controllers/subscription.controller';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import {
    initializePaymentSchema,
    verifyPaymentSchema,
    checkExamModeAccessSchema,
} from '../validators/subscription.validators';

const router = Router();

/**
 * @swagger
 * /subscription/plans:
 *   get:
 *     summary: Get all available subscription plans
 *     description: Retrieve all available subscription plans with their details, pricing, and features.
 *     tags: [Subscription]
 *     responses:
 *       200:
 *         description: Plans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     plans:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           planType:
 *                             type: string
 *                             example: STARTER
 *                           name:
 *                             type: string
 *                             example: Starter Plan
 *                           amount:
 *                             type: number
 *                             example: 500
 *                           durationDays:
 *                             type: integer
 *                             nullable: true
 *                             example: 30
 *                             description: "30 for Starter/Standard, 365 for Annual, null for Free"
 *                           validFor:
 *                             type: integer
 *                             nullable: true
 *                             example: 30
 *                             description: "30 for Starter/Standard, 365 for Annual, null for Free"
 *                           examModes:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: [PURE_JAMB, JAMB_AI]
 *                           features:
 *                             type: object
 *                             properties:
 *                               pureJamb:
 *                                 type: boolean
 *                               jambAI:
 *                                 type: boolean
 *                               singleSubject:
 *                                 type: boolean
 */
router.get('/plans', subscriptionController.getPlans);

/**
 * @swagger
 * /subscription/current:
 *   get:
 *     summary: Get current user subscription
 *     description: |
 *       Get the current active subscription details for the authenticated user.
 *       Users always have an active plan. If no paid subscription is active,
 *       the user automatically falls back to the Free plan.
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: ACTIVE
 *                     currentPlan:
 *                       type: object
 *                       properties:
 *                         planType:
 *                           type: string
 *                           example: STARTER
 *                         name:
 *                           type: string
 *                           example: Starter Plan
 *                         amount:
 *                           type: number
 *                           example: 500
 *                         dateActivated:
 *                           type: string
 *                           format: date-time
 *                           description: The date the user subscribed
 *                         validFor:
 *                           type: integer
 *                           nullable: true
 *                           example: 30
 *                           description: "30 for Starter/Standard, 365 for Annual, null for Free"
 *                         startDate:
 *                           type: string
 *                           format: date-time
 *                         endDate:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                           description: "null for Free plan"
 *                         daysLeft:
 *                           type: integer
 *                           nullable: true
 *                           example: 25
 *                           description: "Dynamic countdown until 0, then falls back to Free. null for Free plan."
 *                         freeTrialsUsed:
 *                           type: array
 *                           items:
 *                             type: string
 *                         freeTrialsRemaining:
 *                           type: integer
 *                           nullable: true
 *                           description: "Number of free trials remaining (only for Free plan)"
 *                         examModes:
 *                           type: array
 *                           items:
 *                             type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/current', authenticate, subscriptionController.getCurrentSubscription);

/**
 * @swagger
 * /subscription/upgrade-options:
 *   get:
 *     summary: Get available upgrade options
 *     description: |
 *       Get available upgrade options based on current subscription.
 *       Users cannot downgrade to a lower plan while on an active paid subscription.
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Upgrade options retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentPlan:
 *                       type: string
 *                     canDowngrade:
 *                       type: boolean
 *                       example: false
 *                     upgradeOptions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     message:
 *                       type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/upgrade-options', authenticate, subscriptionController.getUpgradeOptions);

/**
 * @swagger
 * /subscription/initialize-payment:
 *   post:
 *     summary: Initialize payment for subscription upgrade
 *     description: |
 *       Initialize a Paystack payment transaction for upgrading to a paid subscription plan.
 *       Returns a Paystack authorization URL that the user should be redirected to for payment.
 *
 *       **Important**: Users cannot downgrade to a lower plan while on an active paid subscription.
 *       They can only upgrade to a higher tier plan. When the subscription expires, they will
 *       automatically fall back to the Free plan and can then choose any plan.
 *
 *       Plan hierarchy: FREE < STARTER < STANDARD < ANNUAL
 *       Validity: Starter/Standard = 30 days, Annual = 365 days
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planType
 *               - paymentMethod
 *             properties:
 *               planType:
 *                 type: string
 *                 enum: [STARTER, STANDARD, ANNUAL]
 *                 example: STARTER
 *               paymentMethod:
 *                 type: string
 *                 enum: [CARD, TRANSFER, USSD]
 *                 example: CARD
 *     responses:
 *       200:
 *         description: Payment initialized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentReference:
 *                       type: string
 *                       example: PAY-1234567890-ABCD1234
 *                     amount:
 *                       type: number
 *                       example: 500
 *                     plan:
 *                       type: object
 *                       properties:
 *                         planType:
 *                           type: string
 *                         name:
 *                           type: string
 *                         amount:
 *                           type: number
 *                         validFor:
 *                           type: integer
 *                           example: 30
 *                     authorizationUrl:
 *                       type: string
 *                       description: Paystack payment page URL. Redirect user here to complete payment.
 *                       example: https://checkout.paystack.com/abc123
 *                     accessCode:
 *                       type: string
 *                       description: Paystack access code for inline/popup payment
 *                       example: abc123xyz
 *       400:
 *         description: Invalid request or attempting to downgrade
 *       401:
 *         description: Unauthorized
 */
router.post(
    '/initialize-payment',
    authenticate,
    validate(initializePaymentSchema),
    subscriptionController.initializePayment
);

/**
 * @swagger
 * /subscription/verify-payment:
 *   post:
 *     summary: Verify payment and activate subscription
 *     description: |
 *       Verify a Paystack payment transaction and activate the corresponding subscription.
 *       Called after user completes payment on Paystack checkout.
 *       The payment reference is verified with Paystack to confirm the transaction was successful.
 *     tags: [Subscription]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentReference
 *             properties:
 *               paymentReference:
 *                 type: string
 *                 example: PAY-1234567890-ABCD1234
 *     responses:
 *       200:
 *         description: Payment verified and subscription activated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription:
 *                       type: object
 *                       properties:
 *                         planType:
 *                           type: string
 *                           example: STARTER
 *                         name:
 *                           type: string
 *                           example: Starter Plan
 *                         dateActivated:
 *                           type: string
 *                           format: date-time
 *                         validFor:
 *                           type: integer
 *                           example: 30
 *                         startDate:
 *                           type: string
 *                           format: date-time
 *                         endDate:
 *                           type: string
 *                           format: date-time
 *                         daysLeft:
 *                           type: integer
 *                           example: 30
 *                         isActive:
 *                           type: boolean
 *       400:
 *         description: Invalid payment, already processed, or verification failed
 */
router.post(
    '/verify-payment',
    validate(verifyPaymentSchema),
    subscriptionController.verifyPayment
);

/**
 * @swagger
 * /subscription/check-access:
 *   post:
 *     summary: Check exam mode access
 *     description: Check if user can access a specific exam mode based on their subscription.
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - examMode
 *             properties:
 *               examMode:
 *                 type: string
 *                 enum: [PURE_JAMB, JAMB_AI, SINGLE_SUBJECT]
 *                 example: PURE_JAMB
 *     responses:
 *       200:
 *         description: Access granted
 *       403:
 *         description: Access denied
 *       401:
 *         description: Unauthorized
 */
router.post(
    '/check-access',
    authenticate,
    validate(checkExamModeAccessSchema),
    subscriptionController.checkExamModeAccess
);

/**
 * @swagger
 * /subscription/use-trial:
 *   post:
 *     summary: Mark free trial as used
 *     description: Mark a specific exam mode free trial as used (called when exam is started on free plan).
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - examMode
 *             properties:
 *               examMode:
 *                 type: string
 *                 enum: [PURE_JAMB, JAMB_AI, SINGLE_SUBJECT]
 *     responses:
 *       200:
 *         description: Trial marked as used
 *       401:
 *         description: Unauthorized
 */
router.post(
    '/use-trial',
    authenticate,
    validate(checkExamModeAccessSchema),
    subscriptionController.useTrial
);



export default router;
