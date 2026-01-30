import { User, UserPreferences, Otp, SupportTicket, DeletedEmail, RefreshToken, IUser, Subscription } from '../models';
import { createOtp, verifyOtp } from './otp.service';
import { sendAccountActionOtpEmail, sendSupportTicketConfirmationEmail } from './email.service';
import { hashPassword, comparePassword } from '../utils/password.utils';
import {
    ChangePasswordInput,
    UpdatePreferencesInput,
    CreateSupportTicketInput,
} from '../validators/settings.validators';

// Type describing the User document with all fields we expect
type UserDocument = IUser & {
    _id: any;
};

/**
 * Get user profile detailed info
 */
export const getUserProfile = async (userId: string) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Get active subscription status from Subscription model
    const activeSubscription = await Subscription.findOne({
        userId,
        isActive: true,
        endDate: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    // Determine subscription status
    let subscriptionStatus: 'ACTIVE' | 'INACTIVE' = 'INACTIVE';
    let subscriptionPlan: string | null = null;
    let subscriptionEndDate: Date | null = null;

    if (activeSubscription) {
        subscriptionStatus = 'ACTIVE';
        subscriptionPlan = activeSubscription.planType;
        subscriptionEndDate = activeSubscription.endDate;
    }

    // Format createdAt date for display
    const accountCreation = user.createdAt;

    return {
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        subscription: subscriptionStatus,
        subscriptionPlan,
        subscriptionEndDate,
        accountCreation,
        isVerified: user.isVerified,
        isProfileComplete: user.isProfileComplete,
    };
};

/**
 * Get user preferences
 */
export const getUserPreferences = async (userId: string) => {
    let preferences = await UserPreferences.findOne({ userId });

    // Create default preferences if not exists
    if (!preferences) {
        preferences = await UserPreferences.create({
            userId,
            fontSize: 2, // Default 14px
            theme: 'auto',
        });
    }

    return {
        fontSize: preferences.fontSize,
        theme: preferences.theme,
    };
};

/**
 * Update user preferences
 */
export const updateUserPreferences = async (userId: string, data: UpdatePreferencesInput) => {
    // Upsert preferences
    const preferences = await UserPreferences.findOneAndUpdate(
        { userId },
        { $set: data },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return {
        fontSize: preferences.fontSize,
        theme: preferences.theme,
    };
};

/**
 * Change password
 */
export const changePassword = async (userId: string, data: ChangePasswordInput) => {
    const { oldPassword, newPassword } = data;

    const user = await User.findById(userId) as UserDocument;
    if (!user) throw new Error('User not found');

    // Verify old password
    const isPasswordValid = await comparePassword(oldPassword, user.passwordHash);
    if (!isPasswordValid) throw new Error('Incorrect current password');

    // Check password history (last 3)
    if (user.passwordHistory && user.passwordHistory.length > 0) {
        for (const pastHash of user.passwordHistory) {
            const isAhistoricPassword = await comparePassword(newPassword, pastHash);
            if (isAhistoricPassword) {
                throw new Error('New password cannot be one of your last 3 passwords');
            }
        }
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password array history
    // Add current password hash to history, keep only last 3
    const currentHistory = user.passwordHistory || [];
    const newHistory = [user.passwordHash, ...currentHistory].slice(0, 3);

    // Update user
    await User.findByIdAndUpdate(userId, {
        passwordHash: newPasswordHash,
        passwordHistory: newHistory,
    });

    // Invalidate all sessions (refresh tokens) except current one? 
    // Usually good practice to invalidate all on password change to force re-login on other devices
    await RefreshToken.deleteMany({ userId });
};

/**
 * Initiate account disable
 */
export const initiateAccountDisable = async (userId: string, reason: string) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Store reason temporarily in user doc or just proceed with OTP
    // We'll pass reason to complete step or store it here. 
    // Best practice: Store pending action or just send OTP. 
    // Simpler: Send OTP, client sends reason again with OTP for finalization.

    // Generate OTP
    const otp = await createOtp(userId, 'ACCOUNT_DISABLE');

    // Send Email
    await sendAccountActionOtpEmail(user.email, otp, 'disable');
};

/**
 * Complete account disable
 */
export const completeAccountDisable = async (userId: string, otp: string, reason: string) => {
    // Verify OTP
    const verification = await verifyOtp(userId, otp, 'ACCOUNT_DISABLE');

    if (!verification.isValid) {
        throw new Error(verification.message || 'Invalid or expired OTP');
    }

    // Disable User
    await User.findByIdAndUpdate(userId, {
        isDisabled: true,
        disabledAt: new Date(),
        disableReason: reason,
        subscriptionStatus: 'INACTIVE', // Cancel subscription
    });

    // Invalidate all tokens (Force logout)
    await RefreshToken.deleteMany({ userId });
};

/**
 * Initiate account delete
 */
export const initiateAccountDelete = async (userId: string, reason: string) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const otp = await createOtp(userId, 'ACCOUNT_DELETE');
    await sendAccountActionOtpEmail(user.email, otp, 'delete');
};

/**
 * Complete account delete
 */
export const completeAccountDelete = async (userId: string, otp: string, reason: string) => {
    const user = await User.findById(userId) as UserDocument;
    if (!user) throw new Error('User not found');

    // Verify OTP
    const verification = await verifyOtp(userId, otp, 'ACCOUNT_DELETE');
    if (!verification.isValid) {
        throw new Error(verification.message || 'Invalid or expired OTP');
    }

    // Save email to deleted emails collection for free trial prevention
    // (Only if they actually used the free trial?)
    // Requirement says: "if account is marked as disabled... when trying to login... send message" -> That's disable flow.
    // For delete: "delete their profile... they can reuse platform... should not have access to free trial again"

    // We assume 'hasUsedFreeTrial' is tracked on user model properly.
    // If we delete the user, we lose that flag unless we save it.

    await DeletedEmail.create({
        email: user.email,
        hasUsedFreeTrial: user.hasUsedFreeTrial || false, // Should be true if they accessed paid features/trial
        deleteReason: reason,
    });

    // Delete User and related data
    // TODO: Cascade delete or soft delete? 
    // Requirement implies hard delete ("delete their profile") but maybe soft delete is safer.
    // "we have deleted their profile" implies data is gone.

    // Delete user preferences
    await UserPreferences.deleteOne({ userId });

    // Delete refresh tokens
    await RefreshToken.deleteMany({ userId });

    // Delete OTPs
    await Otp.deleteMany({ userId });

    // Finally delete user
    await User.findByIdAndDelete(userId);
};

/**
 * Create support ticket
 */
export const createSupportTicket = async (userId: string, data: CreateSupportTicketInput) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const ticket = await SupportTicket.create({
        userId,
        ...data,
    });

    // Send confirmation email
    await sendSupportTicketConfirmationEmail(user.email, ticket.ticketNumber, data.issueType);

    // TODO: Ideally also create an in-app notification if we had a Notification system

    return ticket;
};

/**
 * Get user tickets
 */
export const getUserTickets = async (userId: string) => {
    return SupportTicket.find({ userId }).sort({ createdAt: -1 });
};
