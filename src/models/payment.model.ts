import mongoose, { Document, Schema, Model } from 'mongoose';

// Payment status types
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

// Payment method types
export type PaymentMethod = 'CARD' | 'TRANSFER' | 'USSD';

// Payment interface
export interface IPayment extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    subscriptionId?: mongoose.Types.ObjectId;
    amount: number;
    planType: string;
    paymentMethod: PaymentMethod;
    paymentReference: string;
    paymentGatewayReference?: string;
    status: PaymentStatus;
    paidAt?: Date;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

// Payment schema
const paymentSchema = new Schema<IPayment>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        subscriptionId: {
            type: Schema.Types.ObjectId,
            ref: 'Subscription',
            default: null,
        },
        amount: {
            type: Number,
            required: true,
        },
        planType: {
            type: String,
            required: true,
        },
        paymentMethod: {
            type: String,
            enum: ['CARD', 'TRANSFER', 'USSD'],
            required: true,
        },
        paymentReference: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        paymentGatewayReference: {
            type: String,
            default: null,
        },
        status: {
            type: String,
            enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'],
            default: 'PENDING',
            index: true,
        },
        paidAt: {
            type: Date,
            default: null,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Index for finding payments by reference
paymentSchema.index({ paymentReference: 1 });
paymentSchema.index({ userId: 1, status: 1 });

export const Payment: Model<IPayment> = mongoose.model<IPayment>('Payment', paymentSchema);
