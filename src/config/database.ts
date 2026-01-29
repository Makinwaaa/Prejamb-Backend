import mongoose from 'mongoose';
import { config } from './environment';

// Database connection helper
export const connectDatabase = async (): Promise<void> => {
    try {
        // Set mongoose options
        mongoose.set('strictQuery', true);

        // Connect to MongoDB
        await mongoose.connect(config.database.uri);

        console.log('✅ MongoDB connected successfully');

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️ MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected');
        });
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
};

// Database disconnection helper
export const disconnectDatabase = async (): Promise<void> => {
    try {
        await mongoose.disconnect();
        console.log('✅ MongoDB disconnected successfully');
    } catch (error) {
        console.error('❌ MongoDB disconnection failed:', error);
    }
};

// Graceful shutdown handler
export const handleGracefulShutdown = (): void => {
    process.on('SIGINT', async () => {
        await disconnectDatabase();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        await disconnectDatabase();
        process.exit(0);
    });
};
