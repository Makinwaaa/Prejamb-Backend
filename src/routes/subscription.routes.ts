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
 *                           validity:
 *                             type: string
 *                             example: 30 days
 *                           examModes:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: [PURE_JAMB, JAMB_AI]
 */
router.get('/plans', subscriptionController.getPlans);

/**
 * @swagger
 * /subscription/current:
 *   get:
 *     summary: Get current user subscription
 *     description: Get the current active subscription details for the authenticated user.
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
 *                         name:
 *                           type: string
 *                         amount:
 *                           type: number
 *                         startDate:
 *                           type: string
 *                           format: date-time
 *                         endDate:
 *                           type: string
 *                           format: date-time
 *                         daysRemaining:
 *                           type: number
 *                         freeTrialsUsed:
 *                           type: array
 *                           items:
 *                             type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/current', authenticate, subscriptionController.getCurrentSubscription);

/**
 * @swagger
 * /subscription/initialize-payment:
 *   post:
 *     summary: Initialize payment for subscription upgrade
 *     description: Initialize a payment transaction for upgrading to a paid subscription plan.
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
 *       400:
 *         description: Invalid request
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
 *     description: Verify a payment transaction and activate the corresponding subscription.
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
 *               paymentGatewayReference:
 *                 type: string
 *                 description: Optional reference from payment gateway
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
 *       400:
 *         description: Invalid payment or already processed
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

/**
 * @swagger
 * /subscription/cancel:
 *   post:
 *     summary: Cancel subscription
 *     description: Cancel the current active subscription.
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/cancel', authenticate, subscriptionController.cancelSubscription);

export default router;
