import { Controller, Get, Post, Req, Query, UnauthorizedException } from '@nestjs/common';
import { WorkShiftsService } from './work-shifts.service';
import { AuthService } from '../auth/auth.service';
import type { Request } from 'express';
import { AuthUser } from '../auth/auth.types';

const SESSION_COOKIE_NAME = 'factory_session';

type CookieCarrier = {
  cookies?: Record<string, string | undefined>;
};

function getSessionToken(request: Request): string | undefined {
  const cookies = (request as unknown as CookieCarrier).cookies;
  return cookies?.[SESSION_COOKIE_NAME];
}

@Controller('work-shifts')
export class WorkShiftsController {
  constructor(
    private readonly workShiftsService: WorkShiftsService,
    private readonly authService: AuthService,
  ) {}

  private async getUser(request: Request): Promise<AuthUser> {
    const token = getSessionToken(request);
    if (!token) throw new UnauthorizedException('Unauthorized');
    const user = await this.authService.getUserFromToken(token);
    if (!user) throw new UnauthorizedException('Unauthorized');
    return user;
  }

  @Get('current')
  async getCurrentShift(@Req() request: Request) {
    const user = await this.getUser(request);
    return this.workShiftsService.getCurrentShift(user);
  }

  @Post('start')
  async startShift(@Req() request: Request) {
    const user = await this.getUser(request);
    return this.workShiftsService.startShift(user);
  }

  @Post('end')
  async endShift(@Req() request: Request) {
    const user = await this.getUser(request);
    return this.workShiftsService.endShift(user);
  }

  @Get()
  async getHistory(
    @Req() request: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const user = await this.getUser(request);
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.workShiftsService.getHistory(user, pageNum, limitNum);
  }
}
