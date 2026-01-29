import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment schema validation
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('5000'),

    // MongoDB Database
    MONGODB_URI: z.string().min(1, 'MongoDB URI is required'),

    // JWT
    JWT_ACCESS_SECRET: z.string(),
    JWT_REFRESH_SECRET: z.string(),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

    // Email
    SMTP_HOST: z.string(),
    SMTP_PORT: z.string().default('587'),
    SMTP_SECURE: z.string().default('false'),
    SMTP_USER: z.string(),
    SMTP_PASS: z.string(),

    // OTP
    OTP_EXPIRES_IN_MINUTES: z.string().default('10'),
    OTP_MAX_ATTEMPTS: z.string().default('5'),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
    RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),

    // Frontend
    FRONTEND_URL: z.string().default('http://localhost:3000'),
});

// Parse and validate environment variables
const parseEnv = () => {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        console.error('❌ Invalid environment variables:');
        console.error(parsed.error.flatten().fieldErrors);
        throw new Error('Invalid environment variables');
    }

    return parsed.data;
};

export const env = parseEnv();

export const config = {
    nodeEnv: env.NODE_ENV,
    port: parseInt(env.PORT, 10),

    database: {
        uri: env.MONGODB_URI,
    },

    jwt: {
        accessSecret: env.JWT_ACCESS_SECRET,
        refreshSecret: env.JWT_REFRESH_SECRET,
        accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
        refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },

    email: {
        host: env.SMTP_HOST,
        port: parseInt(env.SMTP_PORT, 10),
        secure: env.SMTP_SECURE === 'true',
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
    },

    otp: {
        expiresInMinutes: parseInt(env.OTP_EXPIRES_IN_MINUTES, 10),
        maxAttempts: parseInt(env.OTP_MAX_ATTEMPTS, 10),
    },

    rateLimit: {
        windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
        maxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
    },

    frontendUrl: env.FRONTEND_URL,
};
