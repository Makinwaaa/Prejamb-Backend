import mongoose, { Document, Schema, Model } from 'mongoose';

// Subscription plan types
export type PlanType = 'FREE' | 'STARTER' | 'STANDARD' | 'ANNUAL';

// Exam mode types
export type ExamMode = 'PURE_JAMB' | 'JAMB_AI' | 'SINGLE_SUBJECT';

// Subscription interface
export interface ISubscription extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    planType: PlanType;
    amount: number;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    autoRenew: boolean;
    // Free trial tracking - stores which modes have been used
    freeTrialsUsed: ExamMode[];
    // Payment reference
    paymentReference?: string;
    createdAt: Date;
    updatedAt: Date;
}

// Subscription schema
const subscriptionSchema = new Schema<ISubscription>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        planType: {
            type: String,
            enum: ['FREE', 'STARTER', 'STANDARD', 'ANNUAL'],
            required: true,
            default: 'FREE',
        },
        amount: {
            type: Number,
            required: true,
            default: 0,
        },
        startDate: {
            type: Date,
            required: true,
            default: Date.now,
        },
        endDate: {
            type: Date,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        autoRenew: {
            type: Boolean,
            default: false,
        },
        freeTrialsUsed: {
            type: [String],
            enum: ['PURE_JAMB', 'JAMB_AI', 'SINGLE_SUBJECT'],
            default: [],
        },
        paymentReference: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Index for finding active subscriptions
subscriptionSchema.index({ userId: 1, isActive: 1 });
subscriptionSchema.index({ endDate: 1, isActive: 1 });

export const Subscription: Model<ISubscription> = mongoose.model<ISubscription>(
    'Subscription',
    subscriptionSchema
);
