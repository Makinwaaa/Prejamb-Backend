import mongoose, { Document, Schema, Model } from 'mongoose';

// Theme type
export type ThemeType = 'light' | 'dark' | 'auto';

// Font size levels (1-5)
// 1 = 12px (Small), 2 = 14px (Default), 3 = 16px (Medium), 4 = 18px (Large), 5 = 20px (Extra Large)
export type FontSizeLevel = 1 | 2 | 3 | 4 | 5;

// User Preferences interface
export interface IUserPreferences extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    fontSize: FontSizeLevel;
    theme: ThemeType;
    createdAt: Date;
    updatedAt: Date;
}

// User Preferences schema
const userPreferencesSchema = new Schema<IUserPreferences>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required'],
            unique: true,
            index: true,
        },
        fontSize: {
            type: Number,
            enum: [1, 2, 3, 4, 5],
            default: 2, // 14px - Default
        },
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'auto', // System default
        },
    },
    {
        timestamps: true,
    }
);

// Create and export the UserPreferences model
export const UserPreferences: Model<IUserPreferences> = mongoose.model<IUserPreferences>(
    'UserPreferences',
    userPreferencesSchema
);
