import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import * as settingsController from '../controllers/settings.controller';
import {
    changePasswordSchema,
    updatePreferencesSchema,
    initiateAccountActionSchema,
    verifyAccountActionSchema,
    createSupportTicketSchema,
} from '../validators/settings.validators';

const router = Router();

// Apply authentication to all settings routes
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: User preferences and account management
 */

/**
 * @swagger
 * /settings/profile:
 *   get:
 *     summary: Get user profile information
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 */
router.get('/profile', settingsController.getProfile);

/**
 * @swagger
 * /settings/preferences:
 *   get:
 *     summary: Get user preferences
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User preferences retrieved successfully
 *   put:
 *     summary: Update user preferences
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fontSize:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               theme:
 *                 type: string
 *                 enum: [light, dark, auto]
 *     responses:
 *       200:
 *         description: User preferences updated successfully
 */
router.get('/preferences', settingsController.getPreferences);
router.put(
    '/preferences',
    validate(updatePreferencesSchema),
    settingsController.updatePreferences
);

/**
 * @swagger
 * /settings/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldPassword, newPassword, confirmPassword]
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.post(
    '/change-password',
    validate(changePasswordSchema),
    settingsController.changePassword
);

/**
 * @swagger
 * /settings/disable-account/initiate:
 *   post:
 *     summary: Initiate account disable flow (send OTP)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent to email
 */
router.post(
    '/disable-account/initiate',
    validate(initiateAccountActionSchema),
    settingsController.initiateAccountDisable
);

/**
 * @swagger
 * /settings/disable-account/verify:
 *   post:
 *     summary: Verify OTP and disable account
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [otp]
 *             properties:
 *               otp:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account disabled successfully
 */
router.post(
    '/disable-account/verify',
    validate(verifyAccountActionSchema),
    settingsController.completeAccountDisable
);

/**
 * @swagger
 * /settings/delete-account/initiate:
 *   post:
 *     summary: Initiate account delete flow (send OTP)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent to email
 */
router.post(
    '/delete-account/initiate',
    validate(initiateAccountActionSchema),
    settingsController.initiateAccountDelete
);

/**
 * @swagger
 * /settings/delete-account/verify:
 *   post:
 *     summary: Verify OTP and delete account
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [otp]
 *             properties:
 *               otp:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account deleted successfully
 */
router.post(
    '/delete-account/verify',
    validate(verifyAccountActionSchema),
    settingsController.completeAccountDelete
);

/**
 * @swagger
 * /settings/support-ticket:
 *   post:
 *     summary: Create a support ticket
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [issueType, description]
 *             properties:
 *               issueType:
 *                 type: string
 *                 enum: [TECHNICAL, BILLING, ACCOUNT, SUBSCRIPTION, FEEDBACK, OTHER]
 *               description:
 *                 type: string
 *               attachmentUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Support ticket created successfully
 */
router.post(
    '/support-ticket',
    validate(createSupportTicketSchema),
    settingsController.createSupportTicket
);

/**
 * @swagger
 * /settings/support-tickets:
 *   get:
 *     summary: Get user support tickets
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Support tickets retrieved successfully
 */
router.get('/support-tickets', settingsController.getUserTickets);

export default router;
