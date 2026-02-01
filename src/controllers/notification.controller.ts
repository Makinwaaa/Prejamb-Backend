import { Request, Response, NextFunction } from 'express';
import * as notificationService from '../services/notification.service';

// Extend Request to include user
interface AuthRequest extends Request {
    user?: { userId: string; email: string };
}

/**
 * Get all notifications for authenticated user
 */
export const getNotifications = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const result = await notificationService.getUserNotifications(userId, page, limit);

        res.json({
            success: true,
            message: 'Notifications retrieved successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get unread notifications for authenticated user
 */
export const getUnreadNotifications = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const limit = parseInt(req.query.limit as string) || 50;

        const result = await notificationService.getUnreadNotifications(userId, limit);

        res.json({
            success: true,
            message: 'Unread notifications retrieved successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get unread count
 */
export const getUnreadCount = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const count = await notificationService.getUnreadCount(userId);

        res.json({
            success: true,
            data: { unreadCount: count },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Mark a notification as read
 */
export const markAsRead = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { notificationId } = req.params;

        const notification = await notificationService.markNotificationAsRead(userId, notificationId);

        if (!notification) {
            res.status(404).json({
                success: false,
                message: 'Notification not found',
            });
            return;
        }

        res.json({
            success: true,
            message: 'Notification marked as read',
            data: { notification },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const count = await notificationService.markAllNotificationsAsRead(userId);

        res.json({
            success: true,
            message: `${count} notifications marked as read`,
            data: { markedCount: count },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { notificationId } = req.params;

        const deleted = await notificationService.deleteNotification(userId, notificationId);

        if (!deleted) {
            res.status(404).json({
                success: false,
                message: 'Notification not found',
            });
            return;
        }

        res.json({
            success: true,
            message: 'Notification deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};
