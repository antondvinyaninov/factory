import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthUser } from '../auth/auth.types';
import { CreateNewsPostDto } from './dto/create-news-post.dto';
import { UpdateNewsPostDto } from './dto/update-news-post.dto';

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublished() {
    return this.prisma.newsPost.findMany({
      where: { isPublished: true },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async create(dto: CreateNewsPostDto, author: AuthUser) {
    const { title, content } = this.preparePayload(dto);

    return this.prisma.newsPost.create({
      data: {
        title,
        content,
        authorId: author.id,
        isPublished: true,
        publishedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateNewsPostDto, author: AuthUser) {
    const existingPost = await this.getPostForAuthor(id, author);
    const { title, content } = this.preparePayload(dto);

    return this.prisma.newsPost.update({
      where: { id: existingPost.id },
      data: {
        title,
        content,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(id: string, author: AuthUser) {
    const existingPost = await this.getPostForAuthor(id, author);

    await this.prisma.newsPost.delete({
      where: { id: existingPost.id },
    });

    return { status: 'ok' };
  }

  private preparePayload(dto: CreateNewsPostDto | UpdateNewsPostDto) {
    const title = dto.title?.trim();
    const content = dto.content?.trim();

    if (!title || title.length < 3) {
      throw new BadRequestException('Title is too short');
    }

    if (!content || content.length < 10) {
      throw new BadRequestException('Content is too short');
    }

    return { title, content };
  }

  private async getPostForAuthor(id: string, author: AuthUser) {
    const existingPost = await this.prisma.newsPost.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!existingPost) {
      throw new NotFoundException('News post not found');
    }

    if (existingPost.authorId !== author.id) {
      throw new ForbiddenException('Only author can change this news post');
    }

    return existingPost;
  }
}
