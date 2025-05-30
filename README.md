# OTP Verification API

A secure and production-ready API for OTP (One-Time Password) generation and verification.

## Features

- Secure OTP generation and verification
- Rate limiting and brute force protection
- Session management with secure cookies
- Swagger API documentation
- Production-ready security features
- Docker support
- PostgreSQL database integration

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL
- Docker (optional)

## Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/otp_db?schema=public"

# Security
COOKIE_SECRET="your-strong-cookie-secret"
NODE_ENV="production"

# OTP Configuration
OTP_DURATION_MINUTES=5
MAX_OTP_ATTEMPTS=5
RATE_LIMIT_WINDOW_MINUTES=15

# Cookie Configuration
COOKIE_SECURE=true
COOKIE_SAME_SITE="strict"
COOKIE_HTTP_ONLY=true
COOKIE_MAX_AGE_MINUTES=15

# API Configuration
PORT=3000
API_RATE_LIMIT=100
API_RATE_LIMIT_WINDOW_MINUTES=15
```

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

3. Run database migrations:
   ```bash
   npx prisma migrate deploy
   ```

## Development

```bash
# Run in development mode
npm run start:dev

# Run tests
npm run test

# Run e2e tests
npm run test:e2e
```

## Production Deployment

### Using Docker

1. Build the image:
   ```bash
   docker build -t otp-api .
   ```

2. Run with Docker Compose:
   ```bash
   docker-compose up -d
   ```

### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm run start:prod
   ```

## API Documentation

When running in development mode, Swagger documentation is available at:
```
http://localhost:3000/api
```

## Security Features

- Helmet for secure HTTP headers
- Rate limiting for API endpoints
- Secure session cookies
- Input validation and sanitization
- CORS protection
- Brute force protection

## Health Checks

The API includes health check endpoints:
- `/health` - Basic health check
- `/health/db` - Database connection check

## Monitoring

For production monitoring, consider:
- Setting up application logging
- Implementing error tracking (e.g., Sentry)
- Setting up performance monitoring
- Configuring alerting

## License

[MIT Licensed](LICENSE)
