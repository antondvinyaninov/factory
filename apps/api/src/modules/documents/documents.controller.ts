import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { AuthService } from '../auth/auth.service';
import type { Request } from 'express';
import { AuthUser } from '../auth/auth.types';
import { RouteType } from '@prisma/client';

const SESSION_COOKIE_NAME = 'factory_session';

type CookieCarrier = {
  cookies?: Record<string, string | undefined>;
};

function getSessionToken(request: Request): string | undefined {
  const cookies = (request as unknown as CookieCarrier).cookies;
  return cookies?.[SESSION_COOKIE_NAME];
}

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly authService: AuthService,
  ) {}

  private async getUser(request: Request): Promise<AuthUser> {
    const token = getSessionToken(request);
    if (!token) throw new UnauthorizedException('Unauthorized');
    const user = await this.authService.getUserFromToken(token);
    if (!user) throw new UnauthorizedException('Unauthorized');
    return user;
  }

  @Post()
  async create(
    @Req() request: Request,
    @Body() body: { title: string; content: string; routeType: RouteType; approvers: string[] },
  ) {
    const user = await this.getUser(request);
    return this.documentsService.create(user, body);
  }

  @Get()
  async findAll(@Req() request: Request) {
    const user = await this.getUser(request);
    return this.documentsService.findAll(user);
  }

  @Get(':id')
  async findOne(@Req() request: Request, @Param('id') id: string) {
    await this.getUser(request); // just to check auth
    return this.documentsService.findOne(id);
  }

  @Post(':id/approve')
  async approve(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: { comment?: string },
  ) {
    const user = await this.getUser(request);
    return this.documentsService.approve(user, id, body?.comment);
  }

  @Post(':id/reject')
  async reject(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: { comment?: string },
  ) {
    const user = await this.getUser(request);
    return this.documentsService.reject(user, id, body?.comment);
  }
}
