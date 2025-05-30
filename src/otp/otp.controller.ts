import { Body, Controller, Post, Req, Res, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { OtpService } from './otp.service';
import { Request, Response } from 'express';

@Controller('otp')
export class OtpController {
    constructor(private readonly otpService: OtpService) { }

    private setRateLimitHeaders(res: Response, limit: number, remaining: number, reset: number) {
        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', reset);
    }

    @Post('generate')
    async generateOtp(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.otpService.generateOtp(req, res);

            const resetTime = Math.floor((Date.now() + 15 * 60 * 1000) / 1000);
            this.setRateLimitHeaders(res, 5, result.attemptsLeft, resetTime);

            return res.json({
                uuid: result.uuid,
                attemptsLeft: result.attemptsLeft,
                message: 'OTP generated successfully'
            });
        } catch (error) {
            if (error instanceof ForbiddenException) {
                const resetTime = Math.floor((Date.now() + 15 * 60 * 1000) / 1000);
                this.setRateLimitHeaders(res, 5, 0, resetTime);
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: 'You have exceeded the OTP generation limit. Please try again later.',
                    retryAfter: '15 minutes'
                });
            }
            throw error;
        }
    }

    @Post('verify')
    async verifyOtp(
        @Body() body: { uuid: string; otpCode: string },
        @Req() req: Request,
        @Res() res: Response,
    ) {
        try {
            const result = await this.otpService.verifyOtp(body.uuid, body.otpCode, req, res);

            if (result.success) {
                return res.json({
                    success: true,
                    message: 'OTP verified successfully'
                });
            } else {
                return res.status(400).json({
                    success: false,
                    error: 'Verification failed',
                    message: 'The OTP you entered is invalid or has expired. Please try again.'
                });
            }
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                return res.status(401).json({
                    error: 'Invalid session',
                    message: 'No active OTP session found. Please generate a new OTP.'
                });
            }
            throw error;
        }
    }
}