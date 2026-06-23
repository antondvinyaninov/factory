import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { AuthUser } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';

const SESSION_COOKIE_NAME = 'factory_session';

type CookieCarrier = {
  cookies?: Record<string, string | undefined>;
};

function getSessionToken(request: Request): string | undefined {
  const cookies = (request as unknown as CookieCarrier).cookies;
  return cookies?.[SESSION_COOKIE_NAME];
}

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly authService: AuthService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  async findAll(@Req() request: Request) {
    const user = await this.getUser(request);
    return { items: await this.notificationsService.findAll(user.id) };
  }

  @Patch(':id/read')
  async markAsRead(@Req() request: Request, @Param('id') id: string) {
    const user = await this.getUser(request);
    return { item: await this.notificationsService.markAsRead(id, user.id) };
  }

  @Post('read-all')
  async markAllAsRead(@Req() request: Request) {
    const user = await this.getUser(request);
    await this.notificationsService.markAllAsRead(user.id);
    return { status: 'ok' };
  }

  private async getUser(request: Request): Promise<AuthUser> {
    const token = getSessionToken(request);

    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.authService.getUserFromToken(token);
  }
}
