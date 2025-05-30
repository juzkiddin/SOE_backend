import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
    @ApiProperty({
        description: 'The unique identifier of the OTP to verify',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    @IsString()
    @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, {
        message: 'Invalid UUID format'
    })
    uuid: string;

    @ApiProperty({
        description: 'The OTP code to verify',
        example: '123456'
    })
    @IsString()
    @Length(6, 6)
    @Matches(/^[0-9]{6}$/, {
        message: 'OTP must be exactly 6 digits'
    })
    otpCode: string;
}

export class VerifyOtpResponseDto {
    @ApiProperty({
        description: 'Whether the OTP verification was successful',
        example: true
    })
    success: boolean;
} 