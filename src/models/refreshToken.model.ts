import mongoose, { Document, Schema, Model } from 'mongoose';

// RefreshToken interface for TypeScript
export interface IRefreshToken extends Document {
    _id: mongoose.Types.ObjectId;
    token: string;
    userId: mongoose.Types.ObjectId;
    expiresAt: Date;
    createdAt: Date;
}

// RefreshToken schema definition
const refreshTokenSchema = new Schema<IRefreshToken>(
    {
        token: {
            type: String,
            required: [true, 'Token is required'],
            unique: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required'],
            index: true,
        },
        expiresAt: {
            type: Date,
            required: [true, 'Expiry date is required'],
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false }, // Only createdAt
    }
);

// Create and export the RefreshToken model
export const RefreshToken: Model<IRefreshToken> = mongoose.model<IRefreshToken>(
    'RefreshToken',
    refreshTokenSchema
);
