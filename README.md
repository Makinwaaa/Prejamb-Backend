# Prejamb Backend API

A secure, scalable backend API for Prejamb - a JAMB practice platform for Nigerian students.

## 🚀 Features

- **Secure Authentication**: JWT-based authentication with refresh tokens
- **Email Verification**: OTP-based email verification
- **Password Security**: bcrypt hashing with strong password requirements
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Zod-based runtime validation
- **Nigerian Phone Validation**: Supports +234 format

## 📋 Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: SQLite (dev) / PostgreSQL (prod) with Prisma ORM
- **Authentication**: JWT
- **Email**: Nodemailer with Ethereal (dev)

## 🛠️ Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
DATABASE_URL="file:./dev.db"
JWT_ACCESS_SECRET=your-secret
JWT_REFRESH_SECRET=your-secret
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-pass
```

## 🔗 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/verify-otp` | Verify email OTP |
| POST | `/api/v1/auth/resend-otp` | Resend OTP |
| POST | `/api/v1/auth/complete-profile` | Complete profile |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh-token` | Refresh token |
| POST | `/api/v1/auth/logout` | Logout |
| POST | `/api/v1/auth/forgot-password` | Request reset |
| POST | `/api/v1/auth/reset-password` | Reset password |
| GET | `/api/v1/auth/me` | Get profile |

## 🔒 Security

- Password hashing with bcrypt (12 rounds)
- JWT with short-lived access tokens (15m)
- Refresh token rotation
- Rate limiting on auth endpoints
- OTP expiration and attempt limits
- Input sanitization with Zod

## 📁 Project Structure

```
src/
├── config/         # Configuration files
├── controllers/    # Route handlers
├── middleware/     # Express middleware
├── routes/         # API routes
├── services/       # Business logic
├── types/          # TypeScript types
├── utils/          # Utility functions
├── validators/     # Zod schemas
└── app.ts          # Entry point
```

## 📝 License

ISC
