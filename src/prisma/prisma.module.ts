// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Makes PrismaService available globally
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Explicitly export the service
})
export class PrismaModule { }