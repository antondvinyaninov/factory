import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { AuthService } from '../auth/auth.service';
import type { Request } from 'express';
import { AuthUser } from '../auth/auth.types';
import { TicketStatus } from '@prisma/client';

const SESSION_COOKIE_NAME = 'factory_session';

type CookieCarrier = {
  cookies?: Record<string, string | undefined>;
};

function getSessionToken(request: Request): string | undefined {
  const cookies = (request as unknown as CookieCarrier).cookies;
  return cookies?.[SESSION_COOKIE_NAME];
}

@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly authService: AuthService,
  ) {}

  private async getUser(request: Request): Promise<AuthUser> {
    const token = getSessionToken(request);
    if (!token) throw new UnauthorizedException('Unauthorized');
    const user = await this.authService.getUserFromToken(token);
    if (!user) throw new UnauthorizedException('Unauthorized');
    return user;
  }

  @Get('categories')
  async getCategories() {
    return this.ticketsService.getCategories();
  }

  @Post()
  async create(
    @Req() request: Request,
    @Body() body: { title: string; description: string; categoryId: string },
  ) {
    const user = await this.getUser(request);
    return this.ticketsService.create(user, body);
  }

  @Get()
  async findAll(@Req() request: Request, @Query('filter') filter?: 'my' | 'all') {
    const user = await this.getUser(request);
    return this.ticketsService.findAll(user, filter);
  }

  @Get(':id')
  async findOne(@Req() request: Request, @Param('id') id: string) {
    await this.getUser(request); // just checking auth
    return this.ticketsService.findOne(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: { status: TicketStatus; assigneeId?: string },
  ) {
    const user = await this.getUser(request);
    return this.ticketsService.updateStatus(user, id, body.status, body.assigneeId);
  }

  @Post(':id/comments')
  async addComment(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: { content: string },
  ) {
    const user = await this.getUser(request);
    return this.ticketsService.addComment(user, id, body.content);
  }
}
