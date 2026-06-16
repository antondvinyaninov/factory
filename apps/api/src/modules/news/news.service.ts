import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthUser } from '../auth/auth.types';
import { CreateNewsCommentDto } from './dto/create-news-comment.dto';
import { CreateNewsPostDto } from './dto/create-news-post.dto';
import { UpdateNewsPostDto } from './dto/update-news-post.dto';
import {
  deleteNewsAttachmentFiles,
  mapNewsAttachments,
} from './news-attachments';

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublished(viewer?: AuthUser) {
    const posts = await this.prisma.newsPost.findMany({
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
        likes: {
          select: {
            userId: true,
          },
        },
        comments: {
          where: { parentId: null },
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            replies: {
              orderBy: { createdAt: 'asc' },
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    return posts.map(({ likes, _count, ...post }) => ({
      ...post,
      likesCount: likes.length,
      likedByMe: viewer
        ? likes.some((like) => like.userId === viewer.id)
        : false,
      commentsCount: _count.comments,
    }));
  }

  async create(
    dto: CreateNewsPostDto,
    author: AuthUser,
    files: Express.Multer.File[] = [],
  ) {
    const { title, content } = this.preparePayload(dto);
    const attachments = mapNewsAttachments(files);

    try {
      return await this.prisma.newsPost.create({
        data: {
          title,
          content,
          attachments: attachments,
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
    } catch (error) {
      deleteNewsAttachmentFiles(attachments);
      throw error;
    }
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

    deleteNewsAttachmentFiles(existingPost.attachments);

    return { status: 'ok' };
  }

  async toggleLike(id: string, user: AuthUser) {
    await this.ensurePublishedPost(id);

    const existingLike = await this.prisma.newsLike.findUnique({
      where: {
        postId_userId: {
          postId: id,
          userId: user.id,
        },
      },
    });

    if (existingLike) {
      await this.prisma.newsLike.delete({
        where: { id: existingLike.id },
      });
    } else {
      await this.prisma.newsLike.create({
        data: {
          postId: id,
          userId: user.id,
        },
      });
    }

    const likesCount = await this.prisma.newsLike.count({
      where: { postId: id },
    });

    return {
      liked: !existingLike,
      likesCount,
    };
  }

  async addComment(id: string, dto: CreateNewsCommentDto, author: AuthUser) {
    await this.ensurePublishedPost(id);

    const content = dto.content.trim();

    if (!content) {
      throw new BadRequestException('Comment is empty');
    }

    const parentId = dto.parentId?.trim();

    if (parentId) {
      const parentComment = await this.prisma.newsComment.findFirst({
        where: {
          id: parentId,
          postId: id,
          parentId: null,
        },
        select: {
          id: true,
        },
      });

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    return {
      comment: await this.prisma.newsComment.create({
        data: {
          postId: id,
          authorId: author.id,
          content,
          parentId: parentId || null,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
    };
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
        attachments: true,
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

  private async ensurePublishedPost(id: string) {
    const post = await this.prisma.newsPost.findFirst({
      where: {
        id,
        isPublished: true,
      },
      select: {
        id: true,
      },
    });

    if (!post) {
      throw new NotFoundException('News post not found');
    }

    return post;
  }
}
