import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import * as analyticsService from '../services/analytics.service';
import { sendSuccess } from '../utils/response.utils';

/**
 * Get user dashboard analytics
 */
export const getDashboardAnalytics = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const userId = req.user!._id.toString();
    const analytics = await analyticsService.getUserAnalytics(userId);

    sendSuccess(res, 'Analytics retrieved successfully', analytics);
};
