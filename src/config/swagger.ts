import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './environment';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Prejamb API',
            version: '1.0.0',
            description: 'Backend API for Prejamb - JAMB practice platform for Nigerian students',
            contact: {
                name: 'Prejamb Support',
                email: 'support@prejamb.com',
            },
        },
        servers: [
            {
                url: `http://localhost:${config.port}/api/v1`,
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token',
                },
            },
            schemas: {
                // User Profile
                UserProfile: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                        email: { type: 'string', format: 'email', example: 'user@example.com' },
                        firstName: { type: 'string', example: 'John', nullable: true },
                        lastName: { type: 'string', example: 'Doe', nullable: true },
                        middleName: { type: 'string', example: 'Michael', nullable: true },
                        phoneNumber: { type: 'string', example: '08012345678', nullable: true },
                        isVerified: { type: 'boolean', example: true },
                        isProfileComplete: { type: 'boolean', example: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        subscriptionStatus: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], example: 'ACTIVE' },
                        subscriptionEndDate: { type: 'string', format: 'date-time', nullable: true },
                    },
                },
                // API Response
                ApiResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: { type: 'object' },
                    },
                },
                // Error Response
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string' },
                        errors: {
                            type: 'object',
                            additionalProperties: {
                                type: 'array',
                                items: { type: 'string' },
                            },
                        },
                    },
                },
                // Register Request
                RegisterRequest: {
                    type: 'object',
                    required: ['email', 'password', 'confirmPassword'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'user@example.com' },
                        password: { type: 'string', minLength: 8, example: 'Password123' },
                        confirmPassword: { type: 'string', example: 'Password123' },
                    },
                },
                // Verify OTP Request
                VerifyOtpRequest: {
                    type: 'object',
                    required: ['email', 'otp'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'user@example.com' },
                        otp: { type: 'string', pattern: '^\\d{6}$', example: '123456' },
                    },
                },
                // Resend OTP Request
                ResendOtpRequest: {
                    type: 'object',
                    required: ['email'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'user@example.com' },
                        type: { type: 'string', enum: ['EMAIL_VERIFICATION', 'PASSWORD_RESET'], default: 'EMAIL_VERIFICATION' },
                    },
                },
                // Complete Profile Request
                CompleteProfileRequest: {
                    type: 'object',
                    required: ['firstName', 'lastName', 'phoneNumber'],
                    properties: {
                        firstName: { type: 'string', minLength: 2, maxLength: 50, example: 'John' },
                        lastName: { type: 'string', minLength: 2, maxLength: 50, example: 'Doe' },
                        middleName: { type: 'string', maxLength: 50, example: 'Michael' },
                        phoneNumber: { type: 'string', pattern: '^(\\+234|0)?[789]\\d{9}$', example: '08012345678' },
                    },
                },
                // Login Request
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'user@example.com' },
                        password: { type: 'string', example: 'Password123' },
                    },
                },
                // Refresh Token Request
                RefreshTokenRequest: {
                    type: 'object',
                    required: ['refreshToken'],
                    properties: {
                        refreshToken: { type: 'string' },
                    },
                },
                // Forgot Password Request
                ForgotPasswordRequest: {
                    type: 'object',
                    required: ['email'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'user@example.com' },
                    },
                },
                // Reset Password Request
                ResetPasswordRequest: {
                    type: 'object',
                    required: ['email', 'otp', 'newPassword', 'confirmPassword'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'user@example.com' },
                        otp: { type: 'string', pattern: '^\\d{6}$', example: '123456' },
                        newPassword: { type: 'string', minLength: 8, example: 'NewPassword123' },
                        confirmPassword: { type: 'string', example: 'NewPassword123' },
                    },
                },
                // Auth Tokens Response
                AuthTokensResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string' },
                        data: {
                            type: 'object',
                            properties: {
                                accessToken: { type: 'string' },
                                refreshToken: { type: 'string' },
                                user: { $ref: '#/components/schemas/UserProfile' },
                            },
                        },
                    },
                },
                // Exam Result Schema
                ExamResult: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '65b1234567890abcdef12345' },
                        mode: { type: 'string', enum: ['PURE_JAMB', 'JAMB_AI', 'SINGLE_SUBJECT'] },
                        score: { type: 'number', example: 228 },
                        totalObtainable: { type: 'number', example: 400 },
                        isPassed: { type: 'boolean', example: true },
                        subjects: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    subject: { type: 'string', example: 'Mathematics' },
                                    score: { type: 'number', example: 68 },
                                    total: { type: 'number', example: 100 },
                                },
                            },
                        },
                        startTime: { type: 'string', format: 'date-time' },
                        endTime: { type: 'string', format: 'date-time' },
                        durationSeconds: { type: 'number', example: 7200 },
                        feedback: { type: 'string', example: 'Good job! You have a solid understanding.' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
            },
        },
        tags: [
            {
                name: 'Health',
                description: 'API health check endpoints',
            },
            {
                name: 'Authentication',
                description: 'User authentication and authorization endpoints',
            },
            {
                name: 'Analytics',
                description: 'User performance analytics endpoints',
            },
            {
                name: 'Exams',
                description: 'Exam history and details endpoints',
            },
            {
                name: 'Subscription',
                description: 'Subscription management and payment endpoints',
            },
            {
                name: 'Settings',
                description: 'User settings and preferences endpoints',
            },
        ],
    },
    apis: ['./src/routes/*.ts'], // Path to route files with JSDoc comments
};

export const swaggerSpec = swaggerJsdoc(options);
