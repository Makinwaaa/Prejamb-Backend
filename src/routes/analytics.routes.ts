import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /analytics/dashboard:
 *   get:
 *     summary: Get dashboard analytics
 *     description: Returns quick analytics for the user's exam history (Total Written, Passed, Failed, Average).
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
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
 *                     totalExamsWritten:
 *                       type: number
 *                     examsPassed:
 *                       type: number
 *                     examsFailed:
 *                       type: number
 *                     performanceAverage:
 *                       type: number
 *                       description: Percentage 0-100
 *       401:
 *         description: Unauthorized
 */
router.get('/dashboard', authenticate, analyticsController.getDashboardAnalytics);

export default router;
