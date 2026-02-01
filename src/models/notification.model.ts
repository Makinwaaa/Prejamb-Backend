import mongoose, { Document, Schema, Model } from 'mongoose';

// Notification types
export type NotificationType =
    | 'DAILY_REMINDER'
    | 'EXAM_COMPLETED'
    | 'JAMB_UPDATE'
    | 'STUDY_TIP'
    | 'NEW_QUESTIONS'
    | 'SUBSCRIPTION_REMINDER'
    | 'SYLLABUS_UPDATE'
    | 'WEEKLY_SUMMARY'
    | 'SYSTEM'
    | 'GENERAL';

// Notification interface
export interface INotification extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    isRead: boolean;
    readAt?: Date;
    // Metadata for specific notification types
    metadata?: {
        examId?: string;
        score?: number;
        subject?: string;
        daysRemaining?: number;
        weeklyStats?: {
            examsCompleted: number;
            averageScore: number;
        };
    };
    createdAt: Date;
    updatedAt: Date;
}

// Notification schema
const notificationSchema = new Schema<INotification>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: [
                'DAILY_REMINDER',
                'EXAM_COMPLETED',
                'JAMB_UPDATE',
                'STUDY_TIP',
                'NEW_QUESTIONS',
                'SUBSCRIPTION_REMINDER',
                'SYLLABUS_UPDATE',
                'WEEKLY_SUMMARY',
                'SYSTEM',
                'GENERAL',
            ],
            required: true,
            default: 'GENERAL',
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true,
        },
        readAt: {
            type: Date,
            default: null,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification: Model<INotification> = mongoose.model<INotification>(
    'Notification',
    notificationSchema
);
