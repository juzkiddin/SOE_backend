import { Injectable, ForbiddenException, UnauthorizedException, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as otpGenerator from 'otp-generator';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { RateLimitingService } from '../rate-limiting/rate-limiting.service';
import { CryptoService } from './crypto.service';
import { SmsService } from './sms.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OtpService {
    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        private rateLimitingService: RateLimitingService,
        private cryptoService: CryptoService,
        private smsService: SmsService,
    ) { }

    async generateOtp(
        req: Request,
        res: Response,
        tableId: string
    ): Promise<{ uuid: string; attemptsLeft: number }> {
        // Rate limiting is handled by RateLimitingGuard
        const clientIdentifier = this.getClientIdentifier(req);

        // Record this attempt
        await this.prisma.otpAttempt.create({
            data: {
                clientId: clientIdentifier,
                ipAddress: req.ip,
            },
        });

        // Calculate remaining attempts after recording this one
        const attempts = await this.prisma.otpAttempt.count({
            where: {
                clientId: clientIdentifier,
                createdAt: {
                    gte: new Date(Date.now() - this.rateLimitingService.RATE_LIMIT_WINDOW_MS),
                },
            },
        });
        const attemptsLeft = this.rateLimitingService.MAX_ATTEMPTS - attempts;

        const otpCode = otpGenerator.generate(6, {
            digits: true,
            lowerCaseAlphabets: false,
            upperCaseAlphabets: false,
            specialChars: false,
        });

        const otpDurationMinutes = this.configService.get<number>('OTP_DURATION_MINUTES', 5);
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + otpDurationMinutes);

        // Clear any existing OTP records for this IP before creating a new one
        await this.prisma.otp.deleteMany({
            where: {
                clientId: clientIdentifier,
                verified: false
            }
        });

        const otpRecord = await this.prisma.otp.create({
            data: {
                otpCode,
                expiresAt,
                clientId: clientIdentifier,
                tableId,
                verified: false,
            }
        });

        return { uuid: otpRecord.id, attemptsLeft };
    }

    async generateSmsOtp(
        req: Request,
        res: Response,
        mobileNum: string
    ): Promise<{ uuid: string; attemptsLeft: number }> {
        // Rate limiting is handled by RateLimitingGuard
        const clientIdentifier = this.getClientIdentifier(req);

        // Record this attempt
        await this.prisma.otpAttempt.create({
            data: {
                clientId: clientIdentifier,
                ipAddress: req.ip,
            },
        });

        // Calculate remaining attempts after recording this one
        const attempts = await this.prisma.otpAttempt.count({
            where: {
                clientId: clientIdentifier,
                createdAt: {
                    gte: new Date(Date.now() - this.rateLimitingService.RATE_LIMIT_WINDOW_MS),
                },
            },
        });
        const attemptsLeft = this.rateLimitingService.MAX_ATTEMPTS - attempts;

        const otpCode = otpGenerator.generate(6, {
            digits: true,
            lowerCaseAlphabets: false,
            upperCaseAlphabets: false,
            specialChars: false,
        });

        const otpDurationMinutes = this.configService.get<number>('OTP_DURATION_MINUTES', 5);
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + otpDurationMinutes);

        // Clear any existing OTP records for this IP before creating a new one
        await this.prisma.otp.deleteMany({
            where: {
                clientId: clientIdentifier,
                verified: false
            }
        });

        const otpRecord = await this.prisma.otp.create({
            data: {
                otpCode,
                expiresAt,
                clientId: clientIdentifier,
                mobileNum,
                verified: false,
            }
        });

        // Send SMS with OTP code - throw error if SMS fails
        try {
            const smsResult = await this.smsService.sendOtpSms(mobileNum, otpCode);
            if (!smsResult.success) {
                // Delete the OTP record since SMS failed
                await this.prisma.otp.delete({ where: { id: otpRecord.id } });
                throw new InternalServerErrorException('Failed to send sms');
            }
            console.log(`SMS sent successfully to ${mobileNum}, Message ID: ${smsResult.messageId}`);
        } catch (error) {
            // Delete the OTP record since SMS failed
            await this.prisma.otp.delete({ where: { id: otpRecord.id } });
            if (error instanceof InternalServerErrorException) {
                throw error; // Re-throw our custom error
            }
            throw new InternalServerErrorException('Failed to send sms');
        }

        return { uuid: otpRecord.id, attemptsLeft };
    }

    private getClientIdentifier(req: Request): string {
        // Use only IP address for identification
        return req.ip || req.connection.remoteAddress || 'unknown-ip';
    }

    async verifyOtp(uuid: string, otpCode: string, req: Request, res: Response): Promise<{ success: boolean }> {
        // Find OTP by UUID only (no session/cookie requirement)
        const otpRecord = await this.prisma.otp.findUnique({
            where: { id: uuid },
        });

        if (!otpRecord) {
            return { success: false };
        }

        if (otpRecord.verified || new Date() > otpRecord.expiresAt) {
            return { success: false };
        }

        if (otpRecord.otpCode !== otpCode) {
            return { success: false };
        }

        // On successful verification:
        // 1. Clear rate limit attempts for this IP
        await this.rateLimitingService.clearRateLimitAttempts(req);

        // 2. Mark as verified and delete the OTP
        await this.prisma.otp.update({
            where: { id: uuid },
            data: { verified: true },
        });

        await this.prisma.otp.delete({ where: { id: uuid } });

        return { success: true };
    }

    async getOtp(
        tableId: string,
        clientSecret: string,
        clientKey: string
    ): Promise<{ encryptedOtp: string; publicKey: string; uuid: string }> {
        // Authentication is handled by guard, if we get here, credentials are valid
        const otpRecord = await this.prisma.otp.findFirst({
            where: {
                tableId,
                verified: false,
                expiresAt: {
                    gt: new Date()
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (!otpRecord) {
            throw new NotFoundException('OTP not found');
        }

        const encryptedOtp = this.cryptoService.encryptOtp(otpRecord.otpCode);
        const publicKey = this.cryptoService.getPublicKey();

        return {
            encryptedOtp,
            publicKey,
            uuid: otpRecord.id,
        };
    }
}