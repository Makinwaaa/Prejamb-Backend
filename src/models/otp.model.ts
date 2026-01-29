import mongoose, { Document, Schema, Model } from 'mongoose';

// OTP type enum values
export type OtpType = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'ACCOUNT_DISABLE' | 'ACCOUNT_DELETE';

// OTP interface for TypeScript
export interface IOtp extends Document {
    _id: mongoose.Types.ObjectId;
    code: string;
    type: OtpType;
    expiresAt: Date;
    used: boolean;
    attempts: number;
    userId: mongoose.Types.ObjectId;
    createdAt: Date;
}

// OTP schema definition
const otpSchema = new Schema<IOtp>(
    {
        code: {
            type: String,
            required: [true, 'OTP code is required'],
            index: true,
        },
        type: {
            type: String,
            enum: ['EMAIL_VERIFICATION', 'PASSWORD_RESET', 'ACCOUNT_DISABLE', 'ACCOUNT_DELETE'],
            required: [true, 'OTP type is required'],
        },
        expiresAt: {
            type: Date,
            required: [true, 'Expiry date is required'],
        },
        used: {
            type: Boolean,
            default: false,
        },
        attempts: {
            type: Number,
            default: 0,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required'],
            index: true,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false }, // Only createdAt
    }
);

// Compound index for efficient queries
otpSchema.index({ userId: 1, type: 1, used: 1 });

// Create and export the OTP model
export const Otp: Model<IOtp> = mongoose.model<IOtp>('Otp', otpSchema);
