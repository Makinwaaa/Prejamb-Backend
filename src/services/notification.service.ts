import { Notification, INotification, NotificationType, User, Subscription, ExamResult } from '../models';
import mongoose from 'mongoose';

/**
 * Create a notification for a user
 */
export const createNotification = async (
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, any>
): Promise<INotification> => {
    const notification = await Notification.create({
        userId,
        type,
        title,
        message,
        metadata: metadata || {},
    });

    return notification;
};

/**
 * Get all notifications for a user (paginated)
 */
export const getUserNotifications = async (
    userId: string,
    page: number = 1,
    limit: number = 20
): Promise<{ notifications: INotification[]; total: number; pages: number; unreadCount: number }> => {
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
        Notification.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Notification.countDocuments({ userId }),
        Notification.countDocuments({ userId, isRead: false }),
    ]);

    return {
        notifications,
        total,
        pages: Math.ceil(total / limit),
        unreadCount,
    };
};

/**
 * Get unread notifications for a user
 */
export const getUnreadNotifications = async (
    userId: string,
    limit: number = 50
): Promise<{ notifications: INotification[]; count: number }> => {
    const notifications = await Notification.find({ userId, isRead: false })
        .sort({ createdAt: -1 })
        .limit(limit);

    return {
        notifications,
        count: notifications.length,
    };
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (
    userId: string,
    notificationId: string
): Promise<INotification | null> => {
    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true, readAt: new Date() },
        { new: true }
    );

    return notification;
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<number> => {
    const result = await Notification.updateMany(
        { userId, isRead: false },
        { isRead: true, readAt: new Date() }
    );

    return result.modifiedCount;
};

/**
 * Delete a notification
 */
export const deleteNotification = async (
    userId: string,
    notificationId: string
): Promise<boolean> => {
    const result = await Notification.deleteOne({ _id: notificationId, userId });
    return result.deletedCount > 0;
};

/**
 * Get unread count for a user
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
    return Notification.countDocuments({ userId, isRead: false });
};

// ==================== AUTOMATED NOTIFICATION CREATORS ====================

/**
 * Create exam completed notification
 */
export const createExamCompletedNotification = async (
    userId: string,
    score: number,
    totalObtainable: number,
    subject?: string
): Promise<INotification> => {
    const percentage = Math.round((score / totalObtainable) * 100);
    const subjectText = subject ? ` ${subject}` : '';

    let encouragement = '';
    if (percentage >= 80) {
        encouragement = 'Excellent work!';
    } else if (percentage >= 60) {
        encouragement = 'Great progress!';
    } else if (percentage >= 40) {
        encouragement = 'Keep practicing!';
    } else {
        encouragement = "Don't give up, keep learning!";
    }

    return createNotification(
        userId,
        'EXAM_COMPLETED',
        'Practice Exam Completed',
        `You scored ${percentage}% on your${subjectText} practice exam. ${encouragement}`,
        { score, totalObtainable, percentage, subject }
    );
};

/**
 * Create subscription reminder notification
 */
export const createSubscriptionReminderNotification = async (
    userId: string,
    daysRemaining: number
): Promise<INotification> => {
    return createNotification(
        userId,
        'SUBSCRIPTION_REMINDER',
        'Subscription Reminder',
        `Your subscription expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}. Renew now to continue uninterrupted access.`,
        { daysRemaining }
    );
};

/**
 * Create daily practice reminder notification
 */
export const createDailyReminderNotification = async (
    userId: string
): Promise<INotification> => {
    return createNotification(
        userId,
        'DAILY_REMINDER',
        'Daily Practice Reminder',
        "You haven't practiced today. Complete at least one practice session to stay on track.",
        {}
    );
};

/**
 * Create study tip notification
 */
export const createStudyTipNotification = async (
    userId: string,
    tip: string
): Promise<INotification> => {
    return createNotification(
        userId,
        'STUDY_TIP',
        'Study Tip of the Day',
        tip,
        {}
    );
};

/**
 * Create weekly performance summary notification
 */
export const createWeeklySummaryNotification = async (
    userId: string,
    examsCompleted: number,
    averageScore: number
): Promise<INotification> => {
    return createNotification(
        userId,
        'WEEKLY_SUMMARY',
        'Weekly Performance Summary',
        `You completed ${examsCompleted} practice exam${examsCompleted > 1 ? 's' : ''} last week with an average score of ${averageScore}%. Keep improving!`,
        { weeklyStats: { examsCompleted, averageScore } }
    );
};

/**
 * Create JAMB update notification (for news/announcements)
 */
export const createJambUpdateNotification = async (
    userId: string,
    title: string,
    message: string
): Promise<INotification> => {
    return createNotification(
        userId,
        'JAMB_UPDATE',
        title,
        message,
        {}
    );
};

/**
 * Create new questions available notification
 */
export const createNewQuestionsNotification = async (
    userId: string,
    subjects: string[]
): Promise<INotification> => {
    const subjectList = subjects.join(' and ');
    return createNotification(
        userId,
        'NEW_QUESTIONS',
        'New Questions Available',
        `Fresh ${subjectList} questions have been added to the question bank.`,
        { subjects }
    );
};

/**
 * Create syllabus update notification
 */
export const createSyllabusUpdateNotification = async (
    userId: string,
    year: number
): Promise<INotification> => {
    return createNotification(
        userId,
        'SYLLABUS_UPDATE',
        'JAMB Syllabus Update',
        `The updated JAMB syllabus for ${year} is now available. Review any changes to your subjects.`,
        { year }
    );
};

/**
 * Broadcast notification to all users (for system-wide announcements)
 */
export const broadcastNotification = async (
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, any>
): Promise<number> => {
    const users = await User.find({ isVerified: true, isProfileComplete: true }).select('_id');

    const notifications = users.map(user => ({
        userId: user._id,
        type,
        title,
        message,
        metadata: metadata || {},
        isRead: false,
    }));

    const result = await Notification.insertMany(notifications);
    return result.length;
};
