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
        throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
        throw new Error('Invalid email or password');
    }

    // Check if account is disabled
    if (user.isDisabled) {
        throw new Error('Account is disabled. Please reach out to customer service for reactivation.');
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

    return {
        tokens: { accessToken, refreshToken },
        user: toUserProfile(user),
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
        // Don't reveal if user exists
        return;
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
 * Reset password with OTP
 */
export const resetPassword = async (data: ResetPasswordInput): Promise<void> => {
    const { email, otp, newPassword } = data;

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
