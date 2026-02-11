import crypto from 'crypto';
import { User, RefreshToken, IUser, DeletedEmail } from '../models';
import { hashPassword, comparePassword } from '../utils/password.utils';
import {
    generateAccessToken,
    generateRefreshToken,
    generateTempToken,
    verifyRefreshToken,
} from '../utils/jwt.utils';
import { createOtp, verifyOtp, canRequestNewOtp } from './otp.service';
import { sendOtpEmail, sendWelcomeEmail } from './email.service';
import { createFreeSubscription } from './subscription.service';
import { createWelcomeNotification } from './notification.service';
import {
    RegisterInput,
    VerifyOtpInput,
    CompleteProfileInput,
    LoginInput,
    ResetPasswordInput,
} from '../validators/auth.validators';
import { AuthTokens, UserProfile } from '../types';

/**
 * Helper to convert mongoose user to UserProfile
 */
const toUserProfile = (user: IUser): UserProfile => ({
    id: user._id.toString(),
    email: user.email,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    middleName: user.middleName || null,
    phoneNumber: user.phoneNumber || null,
    isVerified: user.isVerified,
    isProfileComplete: user.isProfileComplete,
    createdAt: user.createdAt,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionPlan: user.subscriptionPlan || 'FREE',
    subscriptionEndDate: user.subscriptionEndDate,
    lastLoginAt: user.lastLoginAt || null,
    avatar: user.avatar || 'default',
});

/**
 * Register a new user
 */
export const registerUser = async (
    data: RegisterInput
): Promise<{ email: string }> => {
    const { email, password } = data;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
        // Check if account is disabled - cannot register with a disabled email
        if (existingUser.isDisabled) {
            throw new Error(
                'This email belongs to a disabled account. Please reactivate your account using the link sent to your email when you disabled it.'
            );
        }
        if (existingUser.isVerified) {
            throw new Error('An account with this email already exists');
        }
        // If user exists but not verified, delete and allow re-registration
        await User.findByIdAndDelete(existingUser._id);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    // Create user

    // Check if this email was previously deleted and used free trial
    const deletedRecord = await DeletedEmail.findOne({ email: email.toLowerCase() });
    const previouslyUsedTrial = deletedRecord ? deletedRecord.hasUsedFreeTrial : false;

    // If previously used trial, deny access (INACTIVE). Else grant trial (ACTIVE).
    const subscriptionStatus = previouslyUsedTrial ? 'INACTIVE' : 'ACTIVE';

    const user = await User.create({
        email: email.toLowerCase(),
        passwordHash,
        subscriptionStatus,
        hasUsedFreeTrial: true, // Mark as having claimed trial opportunity
    });

    // Generate and send OTP
    const otp = await createOtp(user._id.toString(), 'EMAIL_VERIFICATION');
    await sendOtpEmail(email, otp, 'verification');

    return { email: user.email };
};

/**
 * Verify email OTP
 */
export const verifyEmailOtp = async (
    data: VerifyOtpInput
): Promise<{ tempToken: string }> => {
    const { email, otp } = data;

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
        throw new Error('User not found');
    }

    if (user.isVerified) {
        throw new Error('Email already verified');
    }

    // Verify OTP
    const result = await verifyOtp(user._id.toString(), otp, 'EMAIL_VERIFICATION');

    if (!result.isValid) {
        const error = new Error(result.message) as Error & {
            attemptsRemaining?: number;
        };
        error.attemptsRemaining = result.attemptsRemaining;
        throw error;
    }

    // Mark user as verified
    await User.findByIdAndUpdate(user._id, { isVerified: true });

    // Generate temp token for profile completion
    const tempToken = generateTempToken(user._id.toString(), user.email, 'profile_completion');

    return { tempToken };
};

/**
 * Resend OTP
 */
export const resendOtp = async (
    email: string,
    type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'
): Promise<void> => {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
        throw new Error('User not found');
    }

    // Check rate limit
    const canRequest = await canRequestNewOtp(user._id.toString(), type);
    if (!canRequest.canRequest) {
        throw new Error(
            `Please wait ${canRequest.waitSeconds} seconds before requesting a new OTP`
        );
    }

    // Generate and send new OTP
    const otp = await createOtp(user._id.toString(), type);
    const emailType = type === 'EMAIL_VERIFICATION' ? 'verification' : 'password_reset';
    await sendOtpEmail(email, otp, emailType);
};

/**
 * Complete user profile
 */
export const completeProfile = async (
    userId: string,
    data: CompleteProfileInput
): Promise<{ tokens: AuthTokens; user: UserProfile }> => {
    const { firstName, lastName, middleName, phoneNumber } = data;

    // Update user profile
    const user = await User.findByIdAndUpdate(
        userId,
        {
            firstName,
            lastName,
            middleName: middleName || null,
            phoneNumber,
            isProfileComplete: true,
        },
        { new: true } // Return updated document
    );

    if (!user) {
        throw new Error('User not found');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id.toString(), user.email);
    const refreshToken = generateRefreshToken(user._id.toString(), user.email);

    // Store refresh token
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await RefreshToken.create({
        token: crypto.createHash('sha256').update(refreshToken).digest('hex'),
        userId: user._id,
        expiresAt: refreshTokenExpiry,
    });

    // Send welcome email
    await sendWelcomeEmail(user.email, firstName);

    // Create free subscription for new user
    await createFreeSubscription(user._id.toString());

    // Create welcome notification for new user (gives them 1 unread notification by default)
    await createWelcomeNotification(user._id.toString(), firstName);

    return {
        tokens: { accessToken, refreshToken },
        user: toUserProfile(user),
    };
};

/**
 * Login user
 */
export const loginUser = async (
    data: LoginInput
): Promise<{ tokens: AuthTokens; user: UserProfile }> => {
    const { email, password } = data;

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
        throw new Error('Account does not exist');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
        throw new Error('Invalid email or password');
    }

    // Check if account is disabled
    if (user.isDisabled) {
        throw new Error(
            'Your account has been disabled. Please enable it back using the mail we sent to you upon deactivation.'
        );
    }

    // Check if email is verified
    if (!user.isVerified) {
        throw new Error('Please verify your email first');
    }

    // Check if profile is complete
    if (!user.isProfileComplete) {
        // Generate temp token for profile completion
        const tempToken = generateTempToken(user._id.toString(), user.email, 'profile_completion');
        const error = new Error('Please complete your profile') as Error & {
            tempToken?: string;
            requiresProfileCompletion?: boolean;
        };
        error.tempToken = tempToken;
        error.requiresProfileCompletion = true;
        throw error;
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id.toString(), user.email);
    const refreshToken = generateRefreshToken(user._id.toString(), user.email);

    // Store refresh token (hash it for security)
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({
        token: crypto.createHash('sha256').update(refreshToken).digest('hex'),
        userId: user._id,
        expiresAt: refreshTokenExpiry,
    });

    // Update last login time
    const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { lastLoginAt: new Date() },
        { new: true }
    );

    return {
        tokens: { accessToken, refreshToken },
        user: toUserProfile(updatedUser || user),
    };
};

/**
 * Refresh access token
 */
export const refreshAccessToken = async (
    refreshToken: string
): Promise<AuthTokens> => {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
        throw new Error('Invalid refresh token');
    }

    // Check if token exists in database
    const hashedToken = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

    const storedToken = await RefreshToken.findOne({ token: hashedToken }).populate('userId');

    if (!storedToken) {
        throw new Error('Refresh token not found');
    }

    // Get the user
    const user = await User.findById(storedToken.userId);
    if (!user) {
        throw new Error('User not found');
    }

    if (new Date() > storedToken.expiresAt) {
        await RefreshToken.findByIdAndDelete(storedToken._id);
        throw new Error('Refresh token expired');
    }

    // Delete old refresh token (token rotation)
    await RefreshToken.findByIdAndDelete(storedToken._id);

    // Generate new tokens
    const newAccessToken = generateAccessToken(
        user._id.toString(),
        user.email
    );
    const newRefreshToken = generateRefreshToken(
        user._id.toString(),
        user.email
    );

    // Store new refresh token
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({
        token: crypto.createHash('sha256').update(newRefreshToken).digest('hex'),
        userId: user._id,
        expiresAt: refreshTokenExpiry,
    });

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
    };
};

/**
 * Logout user (invalidate refresh token)
 */
export const logoutUser = async (refreshToken: string): Promise<void> => {
    const hashedToken = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

    await RefreshToken.deleteMany({ token: hashedToken });
};

/**
 * Forgot password - send reset OTP
 */
export const forgotPassword = async (email: string): Promise<void> => {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
        throw new Error('User not found');
    }

    // Check rate limit
    const canRequest = await canRequestNewOtp(user._id.toString(), 'PASSWORD_RESET');
    if (!canRequest.canRequest) {
        throw new Error(
            `Please wait ${canRequest.waitSeconds} seconds before requesting a new OTP`
        );
    }

    // Generate and send OTP
    const otp = await createOtp(user._id.toString(), 'PASSWORD_RESET');
    await sendOtpEmail(email, otp, 'password_reset');
};

/**
 * Verify password reset OTP
 */
export const verifyResetOtp = async (
    data: VerifyOtpInput
): Promise<{ tempToken: string }> => {
    const { email, otp } = data;

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
        throw new Error('User not found');
    }

    // Verify OTP
    const result = await verifyOtp(user._id.toString(), otp, 'PASSWORD_RESET');

    if (!result.isValid) {
        const error = new Error(result.message) as Error & {
            attemptsRemaining?: number;
        };
        error.attemptsRemaining = result.attemptsRemaining;
        throw error;
    }

    // Mark user as verified since they proved email ownership
    if (!user.isVerified) {
        await User.findByIdAndUpdate(user._id, { isVerified: true });
    }

    // Generate temp token for password reset
    const tempToken = generateTempToken(
        user._id.toString(),
        user.email,
        'password_reset'
    );

    return { tempToken };
};

/**
 * Reset password with OTP
 */
export const resetPassword = async (
    userId: string,
    data: ResetPasswordInput
): Promise<void> => {
    const { newPassword } = data;

    // Find user
    const user = await User.findById(userId);

    if (!user) {
        throw new Error('User not found');
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await User.findByIdAndUpdate(user._id, { passwordHash });

    // Invalidate all refresh tokens for security
    await RefreshToken.deleteMany({ userId: user._id });
};

/**
 * Get user profile
 */
export const getUserProfile = async (userId: string): Promise<UserProfile> => {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error('User not found');
    }

    return toUserProfile(user);
};

/**
 * Reactivate account with token
 */
export const reactivateAccount = async (token: string): Promise<string> => {
    const user = await User.findOne({ activationToken: token });

    if (!user) {
        throw new Error('Invalid or expired activation link');
    }

    // Activate account
    user.isDisabled = false;
    user.activationToken = undefined; // Clear token
    user.subscriptionStatus = 'ACTIVE'; // Restore status ? Or keep inactive until they resubscribe? 
    // User said "account becomes active". Probably means login access. Subscription might be separate issue.
    // But since we set it to INACTIVE on disable, we might want to set it back if it was active?
    // User didn't specify subscription behavior on reactivation.
    // But since they can login, they can manage subscription.
    // Let's just enable access.

    // However, we should probably set subscription status to ACTIVE or whatever it was.
    // But we don't know what it was. We only know it's currently INACTIVE.
    // Let's assume they start as Free/Inactive or whatever state.
    // Usually 'isDisabled' controls login. 'subscriptionStatus' controls features.

    // Wait, on disable we set subscriptionStatus = 'INACTIVE'.
    // Maybe we should check if they had remaining time?
    // `subscriptionEndDate` wasn't cleared.
    if (user.subscriptionEndDate && user.subscriptionEndDate > new Date()) {
        user.subscriptionStatus = 'ACTIVE';
    } else {
        // Create free subscription if expired? Or just leave as is.
        // Let's just leave subscription logic to subscription service/expiration check helpers.
        // But we MUST allow login.
    }

    await user.save();

    return user.firstName || 'User';
};
