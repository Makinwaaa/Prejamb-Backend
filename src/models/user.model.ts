import mongoose, { Document, Schema, Model } from 'mongoose';

// Subscription status type
export type SubscriptionStatus = 'ACTIVE' | 'INACTIVE';

// User interface for TypeScript
export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    middleName?: string;
    phoneNumber?: string;
    isVerified: boolean;
    isProfileComplete: boolean;
    // Subscription fields
    subscriptionStatus: SubscriptionStatus;
    subscriptionEndDate?: Date;
    // Account status fields
    isDisabled: boolean;
    disabledAt?: Date;
    disableReason?: string;
    // Free trial tracking (persists even after account deletion via deletedEmails)
    hasUsedFreeTrial: boolean;
    // Password security - stores hashes of last 3 passwords
    passwordHistory: string[];
    createdAt: Date;
    updatedAt: Date;
}

// User schema definition
const userSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        passwordHash: {
            type: String,
            required: [true, 'Password is required'],
        },
        firstName: {
            type: String,
            trim: true,
            default: null,
        },
        lastName: {
            type: String,
            trim: true,
            default: null,
        },
        middleName: {
            type: String,
            trim: true,
            default: null,
        },
        phoneNumber: {
            type: String,
            trim: true,
            default: null,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        isProfileComplete: {
            type: Boolean,
            default: false,
        },
        // Subscription fields
        subscriptionStatus: {
            type: String,
            enum: ['ACTIVE', 'INACTIVE'],
            default: 'INACTIVE',
        },
        subscriptionEndDate: {
            type: Date,
            default: null,
        },
        // Account status fields
        isDisabled: {
            type: Boolean,
            default: false,
        },
        disabledAt: {
            type: Date,
            default: null,
        },
        disableReason: {
            type: String,
            default: null,
        },
        // Free trial tracking
        hasUsedFreeTrial: {
            type: Boolean,
            default: false,
        },
        // Password history - stores last 3 password hashes
        passwordHistory: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt
    }
);

// Create and export the User model
export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
