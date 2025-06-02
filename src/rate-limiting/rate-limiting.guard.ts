import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { RateLimitingService } from './rate-limiting.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RateLimitingGuard implements CanActivate {
    constructor(
        private readonly rateLimitingService: RateLimitingService,
        private readonly configService: ConfigService
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const response = context.switchToHttp().getResponse<Response>();

        let cookieId = request.signedCookies?.[this.rateLimitingService.COOKIE_NAME];

        // Create session cookie if none exists and make it immediately available
        if (!cookieId) {
            cookieId = require('uuid').v4();

            // Get proper cookie expiry time from config
            const cookieExpiryMs = this.configService.get<number>('otp.durationMinutes', 5) * 60 * 1000;

            // Determine if we're in production (HTTPS) or development
            const isProduction = process.env.NODE_ENV === 'production';
            const isHttps = request.protocol === 'https' || request.get('x-forwarded-proto') === 'https';

            // Cookie options for cross-site requests
            const cookieOptions: any = {
                maxAge: cookieExpiryMs,
                httpOnly: true,
                signed: true,
            };

            // Set cookie attributes based on environment and protocol
            if (isProduction || isHttps) {
                // Production settings for cross-site requests over HTTPS
                cookieOptions.secure = true;
                cookieOptions.sameSite = 'none';
            } else {
                // Development settings for same-site requests over HTTP
                cookieOptions.secure = false;
                cookieOptions.sameSite = 'lax';
            }

            // Set cookie in response for future requests
            response.cookie(this.rateLimitingService.COOKIE_NAME, cookieId, cookieOptions);

            // Make the cookie immediately available in the current request context
            if (!request.signedCookies) {
                request.signedCookies = {};
            }
            request.signedCookies[this.rateLimitingService.COOKIE_NAME] = cookieId;
        }

        // Check current attempt count without recording a new attempt
        const clientIdentifier = this.getClientIdentifier(request);
        const attempts = await this.rateLimitingService['prisma'].otpAttempt.count({
            where: {
                clientId: clientIdentifier,
                createdAt: {
                    gte: new Date(Date.now() - this.rateLimitingService.RATE_LIMIT_WINDOW_MS),
                },
            },
        });

        if (attempts >= this.rateLimitingService.MAX_ATTEMPTS) {
            // Set rate limit headers
            const resetTime = Math.floor((Date.now() + this.rateLimitingService.RATE_LIMIT_WINDOW_MS) / 1000);
            response.setHeader('X-RateLimit-Limit', this.rateLimitingService.MAX_ATTEMPTS.toString());
            response.setHeader('X-RateLimit-Remaining', '0');
            response.setHeader('X-RateLimit-Reset', resetTime.toString());
            response.setHeader('Retry-After', (this.rateLimitingService.RATE_LIMIT_WINDOW_MS / 1000).toString());

            throw new HttpException(
                {
                    statusCode: 429,
                    message: 'ThrottlerException: Too Many Requests'
                },
                HttpStatus.TOO_MANY_REQUESTS
            );
        }

        return true;
    }

    private getClientIdentifier(req: Request): string {
        const cookieId = req.signedCookies?.[this.rateLimitingService.COOKIE_NAME] || 'no-cookie';
        const ip = req.ip || 'unknown-ip';
        return `${cookieId}-${ip}`;
    }
} 