import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class SmsGenerateOtpDto {
    @ApiProperty({
        description: 'The mobile number for which OTP is being generated',
        example: '+1234567890'
    })
    @IsString()
    @IsNotEmpty()
    @Matches(/^\+?[1-9]\d{1,14}$/, {
        message: 'Invalid mobile number format'
    })
    mobileNum: string;
}

export class SmsGenerateOtpResponseDto {
    @ApiProperty({
        description: 'The unique identifier for the generated OTP',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    uuid: string;

    @ApiProperty({
        description: 'Number of attempts remaining before rate limit is reached',
        example: 4
    })
    attemptsLeft: number;
} 