import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RateLimitingService {
    readonly MAX_ATTEMPTS = 5;
    readonly RATE_LIMIT_WINDOW_MS = 30 * 1000; // 30 seconds

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) { }

    private getClientIdentifier(req: Request): string {
        // Use only IP address for identification
        return req.ip || req.connection.remoteAddress || 'unknown-ip';
    }

    async checkRateLimit(req: Request, res: Response): Promise<{ allowed: boolean; attemptsLeft: number }> {
        const clientIdentifier = this.getClientIdentifier(req);

        const attempts = await this.prisma.otpAttempt.count({
            where: {
                clientId: clientIdentifier,
                createdAt: {
                    gte: new Date(Date.now() - this.RATE_LIMIT_WINDOW_MS),
                },
            },
        });

        const attemptsLeft = this.MAX_ATTEMPTS - attempts;

        if (attempts >= this.MAX_ATTEMPTS) {
            return { allowed: false, attemptsLeft: 0 };
        }

        await this.prisma.otpAttempt.create({
            data: {
                clientId: clientIdentifier,
                ipAddress: req.ip,
            },
        });

        return { allowed: true, attemptsLeft };
    }

    async clearRateLimit(req: Request, res: Response): Promise<void> {
        const clientIdentifier = this.getClientIdentifier(req);
        await this.prisma.otpAttempt.deleteMany({
            where: { clientId: clientIdentifier },
        });
    }

    async clearRateLimitAttempts(req: Request): Promise<void> {
        const clientIdentifier = this.getClientIdentifier(req);
        await this.prisma.otpAttempt.deleteMany({
            where: { clientId: clientIdentifier },
        });
    }
}