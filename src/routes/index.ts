import { Router } from 'express';
import authRoutes from './auth.routes';
import analyticsRoutes from './analytics.routes';
import examRoutes from './exam.routes';
import settingsRoutes from './settings.routes';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: API Health Check
 *     description: Check if the API is running and healthy.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is running
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
 *                   example: Prejamb API is running
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Prejamb API is running',
        timestamp: new Date().toISOString(),
    });
});

// Auth routes
router.use('/auth', authRoutes);

// Analytics routes
router.use('/analytics', analyticsRoutes);

// Exam routes
router.use('/exams', examRoutes);

// Settings routes
router.use('/settings', settingsRoutes);

// Add more routes here as the application grows
// router.use('/users', userRoutes);
// router.use('/questions', questionRoutes);

export default router;
