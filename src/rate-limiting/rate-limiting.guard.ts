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

        // Use only IP address for rate limiting
        const clientIdentifier = this.getClientIdentifier(request);

        // Check current attempt count without recording a new attempt
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
        // Use only IP address for identification
        return req.ip || req.connection.remoteAddress || 'unknown-ip';
    }
} 