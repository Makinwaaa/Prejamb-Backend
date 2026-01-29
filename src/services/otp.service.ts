import crypto from 'crypto';
import { Otp, OtpType } from '../models';
import { config } from '../config/environment';

/**
 * Generate a 6-digit OTP code
 */
export const generateOtpCode = (): string => {
    // Generate a random 6-digit number
    const otp = crypto.randomInt(100000, 999999);
    return otp.toString();
};

/**
 * Create and store a new OTP for a user
 */
export const createOtp = async (
    userId: string,
    type: OtpType
): Promise<string> => {
    // Invalidate any existing OTPs of the same type
    await Otp.updateMany(
        {
            userId,
            type,
            used: false,
        },
        {
            $set: { used: true },
        }
    );

    // Generate new OTP
    const code = generateOtpCode();
    const expiresAt = new Date(
        Date.now() + config.otp.expiresInMinutes * 60 * 1000
    );

    // Store OTP in database
    await Otp.create({
        code,
        type,
        expiresAt,
        userId,
    });

    return code;
};

/**
 * Verify an OTP code
 */
export const verifyOtp = async (
    userId: string,
    code: string,
    type: OtpType
): Promise<{
    isValid: boolean;
    message: string;
    attemptsRemaining?: number;
}> => {
    // Find the most recent unused OTP
    const otp = await Otp.findOne({
        userId,
        type,
        used: false,
    }).sort({ createdAt: -1 });

    if (!otp) {
        return {
            isValid: false,
            message: 'No active OTP found. Please request a new one.',
        };
    }

    // Check if OTP has expired
    if (new Date() > otp.expiresAt) {
        await Otp.findByIdAndUpdate(otp._id, { used: true });
        return {
            isValid: false,
            message: 'OTP has expired. Please request a new one.',
        };
    }

    // Check max attempts
    if (otp.attempts >= config.otp.maxAttempts) {
        await Otp.findByIdAndUpdate(otp._id, { used: true });
        return {
            isValid: false,
            message: 'Maximum OTP attempts exceeded. Please request a new one.',
        };
    }

    // Verify the code
    if (otp.code !== code) {
        const newAttempts = otp.attempts + 1;
        await Otp.findByIdAndUpdate(otp._id, { attempts: newAttempts });
        return {
            isValid: false,
            message: 'Invalid OTP code.',
            attemptsRemaining: config.otp.maxAttempts - newAttempts,
        };
    }

    // Mark OTP as used
    await Otp.findByIdAndUpdate(otp._id, { used: true });

    return {
        isValid: true,
        message: 'OTP verified successfully.',
    };
};

/**
 * Check if user can request a new OTP (rate limiting)
 */
export const canRequestNewOtp = async (
    userId: string,
    type: OtpType
): Promise<{
    canRequest: boolean;
    waitSeconds?: number;
}> => {
    const lastOtp = await Otp.findOne({
        userId,
        type,
    }).sort({ createdAt: -1 });

    if (!lastOtp) {
        return { canRequest: true };
    }

    // Must wait 60 seconds between OTP requests
    const minWaitTime = 60 * 1000; // 1 minute
    const timeSinceLastOtp = Date.now() - lastOtp.createdAt.getTime();

    if (timeSinceLastOtp < minWaitTime) {
        return {
            canRequest: false,
            waitSeconds: Math.ceil((minWaitTime - timeSinceLastOtp) / 1000),
        };
    }

    return { canRequest: true };
};
