import { ApiProperty } from '@nestjs/swagger';

export class GenerateOtpResponseDto {
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