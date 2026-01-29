import { Router } from 'express';
import * as examController from '../controllers/exam.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { examHistoryQuerySchema } from '../validators/exam.validators';

const router = Router();

/**
 * @swagger
 * /exams/history:
 *   get:
 *     summary: Get exam history
 *     description: Retrieve a paginated list of past exams, optionally filtered by mode.
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: mode
 *         schema:
 *           type: string
 *           enum: [PURE_JAMB, JAMB_AI, SINGLE_SUBJECT]
 *         description: Filter by exam mode
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: History retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     exams:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ExamResult'
 *                     total:
 *                       type: number
 *                     pages:
 *                       type: number
 *       401:
 *         description: Unauthorized
 */
router.get(
    '/history',
    authenticate,
    validate(examHistoryQuerySchema),
    examController.getHistory
);

/**
 * @swagger
 * /exams/history/{id}:
 *   get:
 *     summary: Get exam detailed result
 *     description: Get full details of a specific exam result, including subject breakdown and answers.
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Exam Result ID
 *     responses:
 *       200:
 *         description: Exam details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ExamResult'
 *       404:
 *         description: Exam not found
 *       401:
 *         description: Unauthorized
 */
router.get('/history/:id', authenticate, examController.getExamDetail);

/**
 * @swagger
 * /exams/retake/{id}:
 *   post:
 *     summary: Retake an exam
 *     description: Get configuration to retake a past exam (same subjects and mode).
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Retake configuration retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     mode:
 *                       type: string
 *                     subjects:
 *                       type: array
 *                       items:
 *                         type: string
 *       404:
 *         description: Exam not found
 */
router.post('/retake/:id', authenticate, examController.retakeExam);

export default router;
