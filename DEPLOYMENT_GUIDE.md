# Cloudynic AI - Complete Setup & Deployment Guide

## Overview

This guide covers the complete setup of your Cloudynic AI application with Neon PostgreSQL database, Better Auth authentication, Razorpay payments, and AI chat functionality.

## Environment Variables Required

Add these to your `.env.local` file:

```
# Database
DATABASE_URL=your_neon_connection_string

# Authentication
BETTER_AUTH_SECRET=your_random_32_char_secret
BETTER_AUTH_URL=https://yourdomain.com (optional, auto-configured in dev)

# Razorpay Payment Integration
RAZORPAY_KEY_ID=rzp_live_RyTZeOyr9iu6Gb
RAZORPAY_KEY_SECRET=LQdUckBMko9aF1uXhojfojz9
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_RyTZeOyr9iu6Gb

# AI/OpenAI
OPENAI_API_KEY=your_openai_api_key
```

## Database Schema

The application uses the following tables:

### Authentication Tables (Better Auth)
- `user` - User accounts
- `session` - Active sessions
- `account` - OAuth/password credentials
- `verification` - Email verification tokens

### Business Tables
- `subscription_plan` - Pricing plans (Free, Pro, Enterprise)
- `user_subscription` - User subscriptions with Razorpay integration
- `payment` - Payment records with Razorpay verification
- `chat_message` - AI chat conversation history
- `user_usage` - Usage tracking per subscription

## Key Features Implemented

### 1. Authentication
- Email + Password registration and login
- Better Auth framework with secure session management
- User profiles with email verification

### 2. Subscription Plans
Three tiers configured in database:
- **Free**: 10 AI messages/month, 1 GB storage, ₹0
- **Pro**: 1,000 AI messages/month, 10 GB storage, ₹499/month
- **Enterprise**: 100k AI messages/month, 500 GB storage, ₹2,999/month

### 3. Razorpay Payment Integration
- Create orders with `/api/payment/create-order`
- Verify payments with `/api/payment/verify`
- Automatic subscription activation on successful payment
- INR currency with proper amount formatting (multiply by 100 for paise)

### 4. AI Chat
- OpenAI GPT-4 integration via AI SDK
- Message counting against plan limits
- Real-time streaming responses
- Conversation history stored in database

### 5. Dashboard
- User subscription status
- AI message usage tracking
- Plan details and upgrade options
- Integration guide with instructions

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Login
- `POST /api/auth/signup` - Register
- `GET /api/auth/session` - Get current session

### Payments
- `POST /api/payment/create-order` - Create Razorpay order
- `POST /api/payment/verify` - Verify payment and activate subscription

### AI Chat
- `POST /api/ai/chat` - Send message to AI assistant

## Routes

### Public Routes
- `/` - Home page
- `/pricing` - Pricing page with plan cards
- `/auth/login` - Login page
- `/auth/sign-up` - Registration page

### Protected Routes (Require Authentication)
- `/dashboard` - User dashboard with AI chat, plan info, and usage
- `/payment-success` - Payment confirmation page

## Deployment Checklist

- [ ] Set all environment variables in production
- [ ] Enable HTTPS for production
- [ ] Configure `BETTER_AUTH_URL` for production domain
- [ ] Add production domain to Razorpay settings
- [ ] Test payment flow with Razorpay test keys first
- [ ] Verify email sending configuration
- [ ] Set up monitoring for API endpoints
- [ ] Configure database backups with Neon
- [ ] Enable RLS policies if needed
- [ ] Set up error tracking (e.g., Sentry)

## Local Development

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up `.env.local` with the variables above

3. Run dev server:
   ```bash
   pnpm dev
   ```

4. Access at `http://localhost:3000`

## Database Migrations

For schema changes, use the Neon SQL execution directly. All tables are already created in the database.

## Payment Testing

Use Razorpay test credentials:
- Key ID: `rzp_test_xxx`
- Key Secret: Test secret provided by Razorpay

Test card details available in [Razorpay documentation](https://razorpay.com/docs/payments/payments/test-card-numbers/)

## Troubleshooting

### Session Not Persisting
- Check `BETTER_AUTH_SECRET` is set (minimum 32 chars)
- Verify cookie settings in `lib/auth.ts`
- Clear browser cookies and try again

### Payment Fails
- Verify Razorpay credentials are correct
- Check currency is set to INR
- Amount should be in paise (multiply by 100)
- Verify order creation endpoint returns valid order ID

### AI Chat Not Working
- Check OpenAI API key is valid
- Verify user has active subscription with remaining messages
- Check database usage limits are configured

## Support

For issues, check:
1. Server logs for error details
2. Network tab in browser dev tools
3. Database logs in Neon dashboard
4. Razorpay dashboard for payment status

## Additional Resources

- [Better Auth Docs](https://betterauth.dev)
- [Razorpay Integration](https://razorpay.com/docs)
- [Neon PostgreSQL](https://neon.tech)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Vercel Deployment](https://vercel.com/docs)
