import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthUser } from '../auth/auth.types';
import { CreateNewsPostDto } from './dto/create-news-post.dto';

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
    const title = dto.title?.trim();
    const content = dto.content?.trim();

    if (!title || title.length < 3) {
      throw new BadRequestException('Title is too short');
    }

    if (!content || content.length < 10) {
      throw new BadRequestException('Content is too short');
    }

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
}
