import mongoose, { Document, Schema, Model } from 'mongoose';

// Deleted Email interface - tracks emails of deleted accounts for free trial prevention
export interface IDeletedEmail extends Document {
    _id: mongoose.Types.ObjectId;
    email: string;
    hasUsedFreeTrial: boolean;
    deleteReason?: string;
    deletedAt: Date;
}

// Deleted Email schema
const deletedEmailSchema = new Schema<IDeletedEmail>(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        hasUsedFreeTrial: {
            type: Boolean,
            default: false,
        },
        deleteReason: {
            type: String,
            default: null,
        },
        deletedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: false,
    }
);

// Create and export the DeletedEmail model
export const DeletedEmail: Model<IDeletedEmail> = mongoose.model<IDeletedEmail>(
    'DeletedEmail',
    deletedEmailSchema
);
