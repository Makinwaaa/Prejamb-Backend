import nodemailer from 'nodemailer';
import { config } from './environment';

// Create nodemailer transporter
export const createEmailTransporter = () => {
    // For development without SMTP credentials, create a test account
    if (config.nodeEnv === 'development' && (!config.email.user || !config.email.pass)) {
        return null; // Will create Ethereal account on first use
    }

    return nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
            user: config.email.user,
            pass: config.email.pass,
        },
    });
};

export let emailTransporter: nodemailer.Transporter | null = null;

// Initialize email transporter (async for Ethereal setup)
export const initializeEmailTransporter = async (): Promise<void> => {
    if (config.nodeEnv === 'development' && (!config.email.user || !config.email.pass)) {
        // Create Ethereal test account for development
        const testAccount = await nodemailer.createTestAccount();

        emailTransporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });

        console.log('📧 Using Ethereal test email account');
        console.log(`   Email: ${testAccount.user}`);
        console.log('   View sent emails at: https://ethereal.email');
    } else {
        emailTransporter = createEmailTransporter();
        console.log('📧 Email transporter configured');
    }
};
