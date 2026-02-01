import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as dashboardController from '../controllers/dashboard.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard and analytics endpoints
 */

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Get full dashboard data
 *     description: Get complete dashboard data including welcome info, subscription status, analytics, recent exams, and exam modes.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
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
 *                     welcome:
 *                       type: object
 *                       properties:
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         lastLoginAt:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         avatar:
 *                           type: string
 *                           enum: [avatar1, avatar2, avatar3, avatar4, avatar5, avatar6, avatar7, avatar8, default]
 *                     subscription:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [ACTIVE, INACTIVE]
 *                         planType:
 *                           type: string
 *                           nullable: true
 *                         planName:
 *                           type: string
 *                           nullable: true
 *                         daysRemaining:
 *                           type: integer
 *                           nullable: true
 *                         endDate:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                     analytics:
 *                       type: object
 *                       properties:
 *                         totalExams:
 *                           type: integer
 *                         averageScore:
 *                           type: number
 *                         highestScore:
 *                           type: number
 *                         improvementRate:
 *                           type: number
 *                         lastExamDate:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         subjectPerformance:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               subject:
 *                                 type: string
 *                               averageScore:
 *                                 type: number
 *                               examsTaken:
 *                                 type: integer
 *                     recentExams:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           mode:
 *                             type: string
 *                           score:
 *                             type: integer
 *                           totalObtainable:
 *                             type: integer
 *                           percentage:
 *                             type: integer
 *                           isPassed:
 *                             type: boolean
 *                           date:
 *                             type: string
 *                             format: date-time
 *                     examModes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           icon:
 *                             type: string
 *                           available:
 *                             type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, dashboardController.getDashboard);

/**
 * @swagger
 * /dashboard/analytics:
 *   get:
 *     summary: Get quick analytics
 *     description: Get quick analytics for the dashboard showing performance metrics.
 *     tags: [Dashboard]
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalExams:
 *                       type: integer
 *                     averageScore:
 *                       type: number
 *                     highestScore:
 *                       type: number
 *                     improvementRate:
 *                       type: number
 *                     lastExamDate:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     subjectPerformance:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/analytics', authenticate, dashboardController.getQuickAnalytics);

/**
 * @swagger
 * /dashboard/recent-exams:
 *   get:
 *     summary: Get recent exam results
 *     description: Get the most recent exam results (default 3).
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 3
 *         description: Number of recent exams to return
 *     responses:
 *       200:
 *         description: Recent exams retrieved successfully
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
 *                     exams:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/recent-exams', authenticate, dashboardController.getRecentExams);

/**
 * @swagger
 * /dashboard/jamb-news:
 *   get:
 *     summary: Get JAMB news
 *     description: Get latest news and updates from JAMB official sources.
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: JAMB news retrieved successfully
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
 *                     news:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           summary:
 *                             type: string
 *                           date:
 *                             type: string
 *                             format: date-time
 *                           source:
 *                             type: string
 *                           url:
 *                             type: string
 */
router.get('/jamb-news', dashboardController.getJambNews);

export default router;
