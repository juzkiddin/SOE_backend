import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitingService } from './rate-limiting.service';

describe('RateLimitingService', () => {
  let service: RateLimitingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RateLimitingService],
    }).compile();

    service = module.get<RateLimitingService>(RateLimitingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
