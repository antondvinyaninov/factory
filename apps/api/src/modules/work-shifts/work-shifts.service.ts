import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthUser } from '../auth/auth.types';

@Injectable()
export class WorkShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentShift(user: AuthUser) {
    return this.prisma.workShift.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
      },
      orderBy: { startTime: 'desc' },
    });
  }

  async startShift(user: AuthUser) {
    const activeShift = await this.getCurrentShift(user);
    if (activeShift) {
      throw new BadRequestException('У вас уже есть активная смена.');
    }

    return this.prisma.workShift.create({
      data: {
        userId: user.id,
        status: 'ACTIVE',
      },
    });
  }

  async endShift(user: AuthUser) {
    const activeShift = await this.getCurrentShift(user);
    if (!activeShift) {
      throw new BadRequestException('У вас нет активной смены для завершения.');
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - activeShift.startTime.getTime();

    return this.prisma.workShift.update({
      where: { id: activeShift.id },
      data: {
        status: 'CLOSED',
        endTime,
        durationMs,
      },
    });
  }

  async getHistory(user: AuthUser, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.workShift.findMany({
        where: { userId: user.id },
        orderBy: { startTime: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.workShift.count({
        where: { userId: user.id },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
