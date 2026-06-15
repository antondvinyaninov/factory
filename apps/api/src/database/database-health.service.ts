import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class DatabaseHealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    const startedAt = Date.now();
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: 'ok',
      provider: 'postgresql',
      latencyMs: Date.now() - startedAt,
    };
  }
}
