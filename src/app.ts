import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/environment';
import { connectDatabase, handleGracefulShutdown } from './config/database';
import { initializeEmailTransporter } from './config/email';
import { swaggerSpec } from './config/swagger';
import { generalLimiter } from './middleware/rate-limit.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import routes from './routes';

// Initialize Express app
const app: Application = express();

// Security middleware
app.use(helmet()); // Set security HTTP headers
app.use(
    cors({
        origin: config.frontendUrl,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

// Rate limiting
app.use(generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Prejamb API Documentation',
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// API routes
app.use('/api/v1', routes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to Prejamb API',
        version: '1.0.0',
        documentation: '/api-docs',
    });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const startServer = async (): Promise<void> => {
    try {
        // Connect to database
        await connectDatabase();

        // Set up graceful shutdown
        handleGracefulShutdown();

        // Initialize email transporter
        await initializeEmailTransporter();

        // Start listening
        app.listen(config.port, () => {
            console.log('');
            console.log('🚀 ================================');
            console.log('🚀 PREJAMB BACKEND SERVER');
            console.log('🚀 ================================');
            console.log(`📍 Environment: ${config.nodeEnv}`);
            console.log(`🌐 Server running on http://localhost:${config.port}`);
            console.log(`📚 API Base URL: http://localhost:${config.port}/api/v1`);
            console.log(`📖 API Docs: http://localhost:${config.port}/api-docs`);
            console.log(`❤️  Health Check: http://localhost:${config.port}/api/v1/health`);
            console.log('🚀 ================================');
            console.log('');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error) => {
    console.error('❌ Unhandled Rejection:', reason.message);
    // Close server gracefully
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
    console.error('❌ Uncaught Exception:', error.message);
    process.exit(1);
});

// Start the server
startServer();

export default app;
