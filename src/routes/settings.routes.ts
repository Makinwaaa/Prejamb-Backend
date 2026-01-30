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
 *     description: Get user profile with subscription status and account creation date.
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
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
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     middleName:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *                     subscription:
 *                       type: string
 *                       enum: [ACTIVE, INACTIVE]
 *                       description: Current subscription status
 *                     subscriptionPlan:
 *                       type: string
 *                       enum: [FREE, STARTER, STANDARD, ANNUAL]
 *                       nullable: true
 *                     subscriptionEndDate:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     accountCreation:
 *                       type: string
 *                       format: date-time
 *                       description: Date and time account was created
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', settingsController.getProfile);

/**
 * @swagger
 * /settings/preferences:
 *   get:
 *     summary: Get user preferences
 *     description: Get user display preferences including theme and font size.
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User preferences retrieved successfully
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
 *                     fontSize:
 *                       type: integer
 *                       description: Font size level (1-5)
 *                     theme:
 *                       type: string
 *                       enum: [light, dark, auto]
 *                       description: Theme preference (light, dark, or auto for system default)
 *   put:
 *     summary: Update user preferences
 *     description: Update theme and font size. Theme can be light, dark, or auto (follows system theme).
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
 *                 description: Font size level (1=12px, 2=14px, 3=16px, 4=18px, 5=20px)
 *               theme:
 *                 type: string
 *                 enum: [light, dark, auto]
 *                 description: Theme preference. light=light mode, dark=dark mode, auto=follow system theme
 *     responses:
 *       200:
 *         description: User preferences updated successfully
 *       401:
 *         description: Unauthorized
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
 *     description: Change user password. Requires current password verification. New password must be different from current and last 3 passwords. All sessions will be invalidated.
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
 *                 description: Current account password
 *               newPassword:
 *                 type: string
 *                 description: New password (min 8 chars, uppercase, lowercase, number)
 *               confirmPassword:
 *                 type: string
 *                 description: Must match new password
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid current password or password requirements not met
 *       401:
 *         description: Unauthorized
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
 *     description: Create a support ticket. A confirmation email with ticket ID will be sent to the user. The ticket will be saved and tracked.
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
 *                 description: Type of issue being reported
 *               description:
 *                 type: string
 *                 description: Detailed description of the issue (10-2000 characters)
 *               attachmentUrl:
 *                 type: string
 *                 description: Optional URL to attached document
 *     responses:
 *       200:
 *         description: Support ticket created successfully. Confirmation email sent with ticket ID.
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
 *                     ticketNumber:
 *                       type: string
 *                       description: Unique ticket ID for tracking
 *       401:
 *         description: Unauthorized
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
