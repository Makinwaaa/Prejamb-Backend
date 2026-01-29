import mongoose, { Document, Schema, Model } from 'mongoose';

// Issue type enum
export type IssueType =
    | 'TECHNICAL'
    | 'BILLING'
    | 'ACCOUNT'
    | 'SUBSCRIPTION'
    | 'FEEDBACK'
    | 'OTHER';

// Ticket status enum
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

// Support Ticket interface
export interface ISupportTicket extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    ticketNumber: string;
    issueType: IssueType;
    description: string;
    attachmentUrl?: string;
    status: TicketStatus;
    createdAt: Date;
    updatedAt: Date;
}

// Generate unique ticket number
const generateTicketNumber = (): string => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PRJ-${timestamp}-${random}`;
};

// Support Ticket schema
const supportTicketSchema = new Schema<ISupportTicket>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required'],
            index: true,
        },
        ticketNumber: {
            type: String,
            unique: true,
            default: generateTicketNumber,
        },
        issueType: {
            type: String,
            enum: ['TECHNICAL', 'BILLING', 'ACCOUNT', 'SUBSCRIPTION', 'FEEDBACK', 'OTHER'],
            required: [true, 'Issue type is required'],
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
            minlength: [10, 'Description must be at least 10 characters'],
            maxlength: [2000, 'Description must be at most 2000 characters'],
        },
        attachmentUrl: {
            type: String,
            default: null,
        },
        status: {
            type: String,
            enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
            default: 'OPEN',
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for efficient queries
supportTicketSchema.index({ userId: 1, status: 1 });
supportTicketSchema.index({ ticketNumber: 1 });

// Create and export the SupportTicket model
export const SupportTicket: Model<ISupportTicket> = mongoose.model<ISupportTicket>(
    'SupportTicket',
    supportTicketSchema
);
