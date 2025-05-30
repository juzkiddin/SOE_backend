import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class GetOtpRequestDto {
    @ApiProperty({
        description: 'Client secret key for authentication',
        example: 'ABC123xyz789DEF'
    })
    @IsString()
    @Length(14, 14)
    @Matches(/^[A-Za-z0-9]{14}$/, {
        message: 'Client secret must be 14 characters long and contain only alphanumeric characters'
    })
    clientSecret: string;

    @ApiProperty({
        description: 'Client API key for authentication',
        example: 'XYZ987abc456PQR'
    })
    @IsString()
    @Length(14, 14)
    @Matches(/^[A-Za-z0-9]{14}$/, {
        message: 'Client key must be 14 characters long and contain only alphanumeric characters'
    })
    clientKey: string;
}

export class GetOtpResponseDto {
    @ApiProperty({
        description: 'The encrypted OTP value',
        example: 'BASE64_ENCRYPTED_STRING'
    })
    encryptedOtp: string;

    @ApiProperty({
        description: 'The public key to decrypt the OTP',
        example: 'PUBLIC_KEY_STRING'
    })
    publicKey: string;

    @ApiProperty({
        description: 'UUID of the OTP record',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    uuid: string;
} 