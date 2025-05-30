export default () => ({
    database: {
        url: process.env.DATABASE_URL,
    },
    security: {
        cookieSecret: process.env.COOKIE_SECRET || 'your-strong-cookie-secret',
        nodeEnv: process.env.NODE_ENV || 'development',
    },
    otp: {
        durationMinutes: parseInt(process.env.OTP_DURATION_MINUTES || '5', 10),
        maxAttempts: parseInt(process.env.MAX_OTP_ATTEMPTS || '5', 10),
        rateLimitWindowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '15', 10),
    },
    cookie: {
        secure: process.env.COOKIE_SECURE === 'true',
        sameSite: process.env.COOKIE_SAME_SITE || 'strict',
        httpOnly: process.env.COOKIE_HTTP_ONLY === 'true',
        maxAgeMinutes: parseInt(process.env.COOKIE_MAX_AGE_MINUTES || '15', 10),
    },
    api: {
        port: parseInt(process.env.PORT || '3000', 10),
        rateLimit: parseInt(process.env.API_RATE_LIMIT || '100', 10),
        rateLimitWindowMinutes: parseInt(process.env.API_RATE_LIMIT_WINDOW_MINUTES || '15', 10),
    },
}); 