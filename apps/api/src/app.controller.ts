import { Controller, Get, Query, Req, UnauthorizedException } from '@nestjs/common';
import { AppService } from './app.service';
import { DatabaseHealthService } from './database/database-health.service';
import { PrismaService } from './database/prisma.service';
import { AuthService } from './modules/auth/auth.service';
import type { Request } from 'express';

const SESSION_COOKIE_NAME = 'factory_session';

type CookieCarrier = {
  cookies?: Record<string, string | undefined>;
};

function getSessionToken(request: Request): string | undefined {
  const cookies = (request as unknown as CookieCarrier).cookies;
  return cookies?.[SESSION_COOKIE_NAME];
}

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly databaseHealthService: DatabaseHealthService,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health/db')
  async getDatabaseHealth() {
    return this.databaseHealthService.check();
  }

  @Get('search')
  async search(@Req() request: Request, @Query('q') query?: string) {
    const token = getSessionToken(request);
    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }
    const user = await this.authService.getUserFromToken(token);
    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    const q = (query || '').trim();
    if (!q) {
      return { tasks: [], posts: [], chats: [] };
    }

    // 1. Search tasks
    const isTaskAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    const tasks = await this.prisma.task.findMany({
      where: {
        AND: [
          isTaskAdmin
            ? {}
            : {
                OR: [{ creatorId: user.id }, { assigneeId: user.id }],
              },
          {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    // 2. Search news posts (published posts)
    const posts = await this.prisma.newsPost.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { publishedAt: 'desc' },
      take: 20,
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    // 3. Search chats (conversations and messages)
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId: user.id },
        },
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          {
            participants: {
              some: {
                user: {
                  OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { email: { contains: q, mode: 'insensitive' } },
                  ],
                },
              },
            },
          },
          {
            messages: {
              some: {
                content: { contains: q, mode: 'insensitive' },
              },
            },
          },
        ],
      },
      take: 20,
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        messages: {
          where: {
            content: { contains: q, mode: 'insensitive' },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            author: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    const chatsWithLastMessage = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await this.prisma.chatMessage.findFirst({
          where: { conversationId: conv.id },
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { id: true, name: true, email: true } },
          },
        });

        const matchedMessage = conv.messages[0] || null;

        return {
          id: conv.id,
          title: conv.title,
          isGroup: conv.isGroup,
          participants: conv.participants,
          lastMessage,
          matchedMessage,
        };
      })
    );

    return {
      tasks,
      posts,
      chats: chatsWithLastMessage,
    };
  }
}
