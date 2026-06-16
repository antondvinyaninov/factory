import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { AuthUser } from '../auth/auth.types';
import { CreateNewsPostDto } from './dto/create-news-post.dto';
import { NewsService } from './news.service';

const SESSION_COOKIE_NAME = 'factory_session';

type CookieCarrier = {
  cookies?: Record<string, string | undefined>;
};

function getSessionToken(request: Request): string | undefined {
  const cookies = (request as unknown as CookieCarrier).cookies;
  return cookies?.[SESSION_COOKIE_NAME];
}

@Controller('news')
export class NewsController {
  constructor(
    private readonly authService: AuthService,
    private readonly newsService: NewsService,
  ) {}

  @Get()
  async findPublished() {
    return { items: await this.newsService.findPublished() };
  }

  @Post()
  async create(@Req() request: Request, @Body() dto: CreateNewsPostDto) {
    return { item: await this.newsService.create(dto, await this.getUser(request)) };
  }

  private async getUser(request: Request): Promise<AuthUser> {
    const token = getSessionToken(request);

    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.authService.getUserFromToken(token);
  }
}
