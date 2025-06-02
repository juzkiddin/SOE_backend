import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'], // Reduce logging in production
    bodyParser: true
  });

  const configService = app.get(ConfigService);

  // Get allowed origins from environment variable
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

  // CORS configuration for cross-origin requests with credentials
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      // If no specific origins are configured, allow all for development
      if (allowedOrigins.length === 0) {
        return callback(null, true);
      }

      // Check if the origin is in the allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Reject the request
      return callback(new Error('CORS policy violation: Origin not allowed'), false);
    },
    credentials: true, // Allow cookies to be sent cross-origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Cache-Control',
      'X-File-Name'
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Retry-After'
    ],
    preflightContinue: false,
    optionsSuccessStatus: 200,
  });

  // Cookie parser middleware
  app.use(cookieParser(configService.get('COOKIE_SECRET')));

  // Body parser with size limit
  app.use(json({ limit: '10kb' }));

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    disableErrorMessages: process.env.NODE_ENV === 'production'
  }));

  // Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('OTP Verification API')
      .setDescription('API for OTP generation and verification')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  // Enable shutdown hooks
  app.enableShutdownHooks();

  // Start server
  const port = configService.get('api.port', 3000);
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`CORS enabled for origins: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : 'all origins (development mode)'}`);
}
bootstrap();