import { Controller, Post, Body, Req, Res, HttpCode, Param, UseGuards } from '@nestjs/common';
import { OtpService } from './otp.service';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { GenerateOtpDto, GenerateOtpResponseDto } from './dto/generate-otp.dto';
import { VerifyOtpDto, VerifyOtpResponseDto } from './dto/verify-otp.dto';
import { GetOtpRequestDto, GetOtpResponseDto } from './dto/get-otp.dto';
import { SmsGenerateOtpDto, SmsGenerateOtpResponseDto } from './dto/sms-generate-otp.dto';
import { RateLimitingGuard } from '../rate-limiting/rate-limiting.guard';

@ApiTags('OTP')
@Controller('otp')
export class OtpController {
    private readonly RATE_LIMIT_WINDOW = 30; // 30 seconds

    constructor(
        private readonly otpService: OtpService,
        private readonly authService: AuthService
    ) { }

    private setRateLimitHeaders(res: Response, attemptsLeft: number) {
        const resetTime = Math.floor((Date.now() + this.RATE_LIMIT_WINDOW * 1000) / 1000);
        res.setHeader('X-RateLimit-Limit', '5');
        res.setHeader('X-RateLimit-Remaining', attemptsLeft.toString());
        res.setHeader('X-RateLimit-Reset', resetTime.toString());
        if (attemptsLeft === 0) {
            res.setHeader('Retry-After', this.RATE_LIMIT_WINDOW.toString());
        }
    }

    @Post('generate')
    @HttpCode(200)
    @UseGuards(RateLimitingGuard)
    @ApiOperation({ summary: 'Generate a new OTP for table' })
    @ApiResponse({ status: 200, type: GenerateOtpResponseDto })
    @ApiResponse({ status: 429, description: 'Too Many Requests - Rate limit exceeded' })
    async generateOtp(
        @Body() generateOtpDto: GenerateOtpDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ): Promise<GenerateOtpResponseDto> {
        const result = await this.otpService.generateOtp(req, res, generateOtpDto.tableId);
        this.setRateLimitHeaders(res, result.attemptsLeft);
        return result;
    }

    @Post('smsgen')
    @HttpCode(200)
    @UseGuards(RateLimitingGuard)
    @ApiOperation({ summary: 'Generate a new OTP for SMS' })
    @ApiResponse({ status: 200, type: SmsGenerateOtpResponseDto })
    @ApiResponse({ status: 429, description: 'Too Many Requests - Rate limit exceeded' })
    @ApiResponse({ status: 500, description: 'Failed to send sms' })
    async generateSmsOtp(
        @Body() smsGenerateOtpDto: SmsGenerateOtpDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ): Promise<SmsGenerateOtpResponseDto> {
        const result = await this.otpService.generateSmsOtp(req, res, smsGenerateOtpDto.mobileNum);
        this.setRateLimitHeaders(res, result.attemptsLeft);
        return result;
    }

    @Post(':tableId/get')
    @HttpCode(200)
    @ApiOperation({ summary: 'Get encrypted OTP value using client credentials' })
    @ApiParam({ name: 'tableId', description: 'Table ID for which to retrieve the OTP' })
    @ApiResponse({ status: 200, type: GetOtpResponseDto })
    @ApiResponse({ status: 401, description: 'Invalid client credentials' })
    @ApiResponse({ status: 404, description: 'OTP not found' })
    async getOtp(
        @Param('tableId') tableId: string,
        @Body() credentials: GetOtpRequestDto,
    ): Promise<GetOtpResponseDto> {
        // Validate client credentials
        this.authService.validateClientCredentials(
            credentials.clientSecret,
            credentials.clientKey
        );

        return this.otpService.getOtp(
            tableId,
            credentials.clientSecret,
            credentials.clientKey
        );
    }

    @Post('verify')
    @HttpCode(200)
    @ApiOperation({ summary: 'Verify an OTP (works for both table and SMS OTPs)' })
    @ApiResponse({ status: 200, type: VerifyOtpResponseDto })
    async verifyOtp(
        @Body() verifyOtpDto: VerifyOtpDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ): Promise<VerifyOtpResponseDto> {
        return this.otpService.verifyOtp(
            verifyOtpDto.uuid,
            verifyOtpDto.otpCode,
            req,
            res,
        );
    }

    @Post('smsverify')
    @HttpCode(200)
    @ApiOperation({ summary: 'Verify an SMS OTP (alias for verify endpoint)' })
    @ApiResponse({ status: 200, type: VerifyOtpResponseDto })
    async verifySmsOtp(
        @Body() verifyOtpDto: VerifyOtpDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ): Promise<VerifyOtpResponseDto> {
        // This is essentially the same as verifyOtp since verification logic is identical
        return this.otpService.verifyOtp(
            verifyOtpDto.uuid,
            verifyOtpDto.otpCode,
            req,
            res,
        );
    }
}