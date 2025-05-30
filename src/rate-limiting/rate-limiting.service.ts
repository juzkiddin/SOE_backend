import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';

@Injectable()
export class RateLimitingService {
    private readonly MAX_ATTEMPTS = 5;
    private readonly COOKIE_NAME = 'otp_attempts';
    private readonly COOKIE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

    constructor(private prisma: PrismaService) { }

    async checkRateLimit(uuid: string, res: Response): Promise<{ allowed: boolean; attemptsLeft: number }> {
        const attempts = await this.prisma.otpAttempt.aggregate({
            _count: true,
            where: {
                clientId: uuid,
                createdAt: {
                    gte: new Date(Date.now() - this.COOKIE_EXPIRY_MS),
                },
            },
        });

        const attemptsCount = attempts._count;
        const attemptsLeft = this.MAX_ATTEMPTS - attemptsCount;

        if (attemptsCount >= this.MAX_ATTEMPTS) {
            return { allowed: false, attemptsLeft: 0 };
        }

        // Record the attempt
        await this.prisma.otpAttempt.create({
            data: {
                clientId: uuid,
            },
        });

        // Set cookie with remaining attempts
        res.cookie(this.COOKIE_NAME, uuid, {
            maxAge: this.COOKIE_EXPIRY_MS,
            httpOnly: true,
            sameSite: 'strict',
        });

        return { allowed: true, attemptsLeft };
    }

    async clearRateLimit(uuid: string, res: Response): Promise<void> {
        // Clear attempts for this client
        await this.prisma.otpAttempt.deleteMany({
            where: { clientId: uuid },
        });

        // Clear the cookie
        res.clearCookie(this.COOKIE_NAME);
    }
}