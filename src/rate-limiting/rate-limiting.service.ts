import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Response, Request } from 'express';

@Injectable()
export class RateLimitingService {
    readonly MAX_ATTEMPTS = 5;
    readonly COOKIE_NAME = 'otp_attempts';
    readonly COOKIE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

    constructor(private prisma: PrismaService) { }

    private getClientIdentifier(req: Request): string {
        const cookieId = req.signedCookies?.[this.COOKIE_NAME] || 'no-cookie';
        const ip = req.ip || 'unknown-ip';
        return `${cookieId}-${ip}`;
    }

    async checkRateLimit(req: Request, res: Response): Promise<{ allowed: boolean; attemptsLeft: number }> {
        // Always generate a new cookie if none exists
        if (!req.signedCookies?.[this.COOKIE_NAME]) {
            res.cookie(this.COOKIE_NAME, require('uuid').v4(), {
                maxAge: this.COOKIE_EXPIRY_MS,
                httpOnly: true,
                sameSite: 'strict',
                signed: true,
            });
        }

        const clientIdentifier = this.getClientIdentifier(req);

        const attempts = await this.prisma.otpAttempt.count({
            where: {
                clientId: clientIdentifier,
                createdAt: {
                    gte: new Date(Date.now() - this.COOKIE_EXPIRY_MS),
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
        res.clearCookie(this.COOKIE_NAME);
    }

    async clearRateLimitAttempts(req: Request): Promise<void> {
        const clientIdentifier = this.getClientIdentifier(req);
        await this.prisma.otpAttempt.deleteMany({
            where: { clientId: clientIdentifier },
        });
    }
}