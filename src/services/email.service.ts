import nodemailer from 'nodemailer';
import { emailTransporter } from '../config/email';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email
 */
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  if (!emailTransporter) {
    console.log('📧 Email transporter not initialized, skipping email send');
    console.log(`   To: ${options.to}`);
    console.log(`   Subject: ${options.subject}`);
    return;
  }

  const info = await emailTransporter.sendMail({
    from: '"Prejamb" <noreply@prejamb.com>',
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  console.log(`📧 Email sent: ${info.messageId}`);

  // Log preview URL for Ethereal emails
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`   Preview URL: ${previewUrl}`);
  }
};

/**
 * Send OTP verification email
 */
export const sendOtpEmail = async (
  email: string,
  otp: string,
  type: 'verification' | 'password_reset'
): Promise<void> => {
  const subject = type === 'verification'
    ? 'Verify your Prejamb account'
    : 'Reset your Prejamb password';

  const purpose = type === 'verification'
    ? 'verify your email address'
    : 'reset your password';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          padding: 0;
        }
        .header {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 12px 12px 0 0;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .content {
          background: white;
          padding: 40px 30px;
          border-radius: 0 0 12px 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .otp-code {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 2px dashed #2563eb;
          border-radius: 12px;
          padding: 25px;
          text-align: center;
          margin: 25px 0;
        }
        .otp-code span {
          font-size: 36px;
          font-weight: 700;
          letter-spacing: 8px;
          color: #1e40af;
          font-family: 'Courier New', monospace;
        }
        .warning {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 0 8px 8px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
        p {
          color: #374151;
          margin: 15px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 Prejamb</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>You requested to ${purpose}. Please use the following OTP code:</p>
          
          <div class="otp-code">
            <span>${otp}</span>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>This code expires in <strong>10 minutes</strong></li>
              <li>Do not share this code with anyone</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
          </div>
          
          <p>Best of luck with your JAMB preparation! 📚</p>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Prejamb. Your success, our mission.</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({ to: email, subject, html });
};

/**
 * Send welcome email after profile completion
 */
export const sendWelcomeEmail = async (
  email: string,
  firstName: string
): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Prejamb!</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          padding: 0;
        }
        .header {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          color: white;
          padding: 40px 30px;
          text-align: center;
          border-radius: 12px 12px 0 0;
        }
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 28px;
          font-weight: 700;
        }
        .header p {
          margin: 0;
          opacity: 0.9;
          font-size: 16px;
          color: white;
        }
        .content {
          background: white;
          padding: 40px 30px;
          border-radius: 0 0 12px 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .features {
          background: #f0fdf4;
          border-radius: 12px;
          padding: 25px;
          margin: 25px 0;
        }
        .feature {
          display: flex;
          align-items: center;
          margin: 15px 0;
        }
        .feature-icon {
          font-size: 24px;
          margin-right: 15px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
        p {
          color: #374151;
          margin: 15px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to Prejamb!</h1>
          <p>Your journey to JAMB success starts now</p>
        </div>
        <div class="content">
          <p>Hi ${firstName},</p>
          <p>Congratulations! Your account has been successfully created. You're now part of thousands of students preparing for JAMB success.</p>
          
          <div class="features">
            <h3 style="margin-top: 0; color: #047857;">What you can do now:</h3>
            <div class="feature">
              <span class="feature-icon">📝</span>
              <span>Practice with past JAMB questions</span>
            </div>
            <div class="feature">
              <span class="feature-icon">📊</span>
              <span>Track your progress and performance</span>
            </div>
            <div class="feature">
              <span class="feature-icon">🎯</span>
              <span>Focus on your weak areas</span>
            </div>
            <div class="feature">
              <span class="feature-icon">🏆</span>
              <span>Compete with other students</span>
            </div>
          </div>
          
          <p>We're here to support you every step of the way. Good luck with your JAMB preparation!</p>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Prejamb. Your success, our mission.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'Welcome to Prejamb! 🎓',
    html,
  });
};

/**
 * Send account action OTP email (disable/delete)
 */
export const sendAccountActionOtpEmail = async (
  email: string,
  otp: string,
  action: 'disable' | 'delete'
): Promise<void> => {
  const actionText = action === 'disable' ? 'disable your account' : 'delete your account';
  const warningText = action === 'delete'
    ? 'This action cannot be undone. All your data will be permanently removed.'
    : 'You will be logged out immediately upon confirmation.';

  const subject = `${action === 'disable' ? 'Disable' : 'Delete'} Prejamb Account Verification`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 40px auto; padding: 0; }
        .header { background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
        .content { background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .otp-code { background: #fee2e2; border: 2px dashed #ef4444; border-radius: 12px; padding: 25px; text-align: center; margin: 25px 0; }
        .otp-code span { font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #b91c1c; font-family: 'Courier New', monospace; }
        .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Account Action Verification</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>We received a request to <strong>${actionText}</strong>.</p>
          <p>Please use the following OTP code to confirm this action:</p>
          
          <div class="otp-code">
            <span>${otp}</span>
          </div>
          
          <div class="warning">
            <strong>⚠️ Warning:</strong>
            <p style="margin: 5px 0 0 0;">${warningText}</p>
          </div>
          
          <p>If you did not initiate this request, please secure your account immediately by changing your password.</p>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Prejamb. Your success, our mission.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

  await sendEmail({ to: email, subject, html });
};

/**
 * Send support ticket confirmation email
 */
export const sendSupportTicketConfirmationEmail = async (
  email: string,
  ticketNumber: string,
  issueType: string
): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Support Ticket Received</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 40px auto; padding: 0; }
        .header { background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
        .content { background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .ticket-info { background: #f0f9ff; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #0284c7; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Support Ticket Received</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>We have received your support request. Our team will review it and get back to you shortly.</p>
          
          <div class="ticket-info">
            <p style="margin: 0;"><strong>Ticket Number:</strong> ${ticketNumber}</p>
            <p style="margin: 5px 0 0 0;"><strong>Issue Type:</strong> ${issueType}</p>
          </div>
          
          <p>You can track the status of this ticket in your Settings > Help tab.</p>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Prejamb. Your success, our mission.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

  await sendEmail({
    to: email,
    subject: `[${ticketNumber}] Support Request Received`,
    html,
  });
};
