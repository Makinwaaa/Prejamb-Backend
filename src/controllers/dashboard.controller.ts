import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboard.service';

// Extend Request to include user
interface AuthRequest extends Request {
    user?: { userId: string; email: string };
}

/**
 * Get dashboard data for authenticated user
 */
export const getDashboard = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;

        // Check subscription expiry on each dashboard load
        await dashboardService.checkAndHandleSubscriptionExpiry(userId);

        const data = await dashboardService.getDashboardData(userId);

        res.json({
            success: true,
            message: 'Dashboard data retrieved successfully',
            data,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get quick analytics for dashboard
 */
export const getQuickAnalytics = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const analytics = await dashboardService.getQuickAnalytics(userId);

        res.json({
            success: true,
            message: 'Analytics retrieved successfully',
            data: analytics,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get recent exam results
 */
export const getRecentExams = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const limit = parseInt(req.query.limit as string) || 3;
        const exams = await dashboardService.getRecentExamResults(userId, limit);

        res.json({
            success: true,
            message: 'Recent exams retrieved successfully',
            data: { exams },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get JAMB news
 */
export const getJambNews = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const news = await dashboardService.getJambNews();

        res.json({
            success: true,
            message: 'JAMB news retrieved successfully',
            data: { news },
        });
    } catch (error) {
        next(error);
    }
};
