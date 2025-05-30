import { Controller, Post, Body, Req, Res, HttpCode } from '@nestjs/common';
import { OtpService } from './otp.service';
import { Request, Response } from 'express';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GenerateOtpResponseDto } from './dto/generate-otp.dto';
import { VerifyOtpDto, VerifyOtpResponseDto } from './dto/verify-otp.dto';

@ApiTags('OTP')
@Controller('otp')
export class OtpController {
    constructor(private readonly otpService: OtpService) { }

    @Post('generate')
    @HttpCode(200)
    @ApiOperation({ summary: 'Generate a new OTP' })
    @ApiResponse({ status: 200, type: GenerateOtpResponseDto })
    @ApiResponse({ status: 403, description: 'Rate limit exceeded' })
    async generateOtp(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ): Promise<GenerateOtpResponseDto> {
        return this.otpService.generateOtp(req, res);
    }

    @Post('verify')
    @HttpCode(200)
    @ApiOperation({ summary: 'Verify an OTP' })
    @ApiResponse({ status: 200, type: VerifyOtpResponseDto })
    @ApiResponse({ status: 401, description: 'No active OTP session' })
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
}