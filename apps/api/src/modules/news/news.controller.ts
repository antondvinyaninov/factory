import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { AuthUser } from '../auth/auth.types';
import { CreateNewsCommentDto } from './dto/create-news-comment.dto';
import { CreateNewsPostDto } from './dto/create-news-post.dto';
import { UpdateNewsPostDto } from './dto/update-news-post.dto';
import { getNewsUploadOptions } from './news-attachments';
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
  async findPublished(@Req() request: Request) {
    return {
      items: await this.newsService.findPublished(
        await this.getOptionalUser(request),
      ),
    };
  }

  @Post()
  @UseInterceptors(FilesInterceptor('attachments', 8, getNewsUploadOptions()))
  async create(
    @Req() request: Request,
    @Body() dto: CreateNewsPostDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return {
      item: await this.newsService.create(
        dto,
        await this.getUser(request),
        files,
      ),
    };
  }

  @Patch(':id')
  async update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: UpdateNewsPostDto,
  ) {
    return {
      item: await this.newsService.update(id, dto, await this.getUser(request)),
    };
  }

  @Delete(':id')
  async remove(@Req() request: Request, @Param('id') id: string) {
    return this.newsService.remove(id, await this.getUser(request));
  }

  @Post(':id/like')
  async toggleLike(@Req() request: Request, @Param('id') id: string) {
    return this.newsService.toggleLike(id, await this.getUser(request));
  }

  @Post(':id/comments')
  async addComment(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: CreateNewsCommentDto,
  ) {
    return this.newsService.addComment(id, dto, await this.getUser(request));
  }

  private async getUser(request: Request): Promise<AuthUser> {
    const token = getSessionToken(request);

    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.authService.getUserFromToken(token);
  }

  private async getOptionalUser(
    request: Request,
  ): Promise<AuthUser | undefined> {
    const token = getSessionToken(request);

    if (!token) {
      return undefined;
    }

    return this.authService.getUserFromToken(token);
  }
}
