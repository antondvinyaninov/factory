import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthUser } from '../auth/auth.types';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

const userSelect = {
  id: true,
  name: true,
  email: true,
};

const conversationInclude = {
  participants: {
    include: {
      user: {
        select: userSelect,
      },
    },
    orderBy: {
      joinedAt: 'asc' as const,
    },
  },
  messages: {
    take: 1,
    orderBy: {
      createdAt: 'desc' as const,
    },
    include: {
      author: {
        select: userSelect,
      },
    },
  },
};

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(user: AuthUser) {
    return this.prisma.user.findMany({
      where: {
        id: { not: user.id },
        isActive: true,
      },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      take: 50,
      select: userSelect,
    });
  }

  async findConversations(user: AuthUser) {
    const conversations = await this.prisma.conversation.findMany({
      relationLoadStrategy: 'join',
      where: {
        participants: {
          some: {
            userId: user.id,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 50,
      include: conversationInclude,
    });

    return Promise.all(
      conversations.map(async (conv) => {
        const formatted = formatConversation(conv);
        const myParticipant = conv.participants.find(p => p.userId === user.id);
        
        const lastMessage = formatted.lastMessage as any;
        let unreadCount = 0;
        if (lastMessage && lastMessage.authorId !== user.id) {
          if (!myParticipant?.lastReadAt) {
            unreadCount = 1;
          } else {
            const count = await this.prisma.chatMessage.count({
              where: {
                conversationId: conv.id,
                createdAt: { gt: myParticipant.lastReadAt },
                authorId: { not: user.id },
              },
            });
            unreadCount = count;
          }
        }
        
        return {
          ...formatted,
          unreadCount,
        };
      }),
    );
  }

  async createConversation(dto: CreateConversationDto, creator: AuthUser) {
    const otherParticipantIds = Array.from(
      new Set(
        dto.participantIds
          .map((participantId) => participantId.trim())
          .filter(
            (participantId) => participantId && participantId !== creator.id,
          ),
      ),
    );

    if (otherParticipantIds.length === 0) {
      throw new BadRequestException('Conversation needs another participant');
    }

    const participantIds = [creator.id, ...otherParticipantIds];
    const activeUsersCount = await this.prisma.user.count({
      where: {
        id: { in: participantIds },
        isActive: true,
      },
    });

    if (activeUsersCount !== participantIds.length) {
      throw new BadRequestException('Some participants are not available');
    }

    if (otherParticipantIds.length === 1 && !dto.title?.trim()) {
      const existingConversation = await this.findDirectConversation(
        creator.id,
        otherParticipantIds[0],
      );

      if (existingConversation) {
        return existingConversation;
      }
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        title: dto.title?.trim() || null,
        isGroup: otherParticipantIds.length > 1,
        createdById: creator.id,
        participants: {
          create: participantIds.map((userId) => ({ userId })),
        },
      },
      include: conversationInclude,
    });

    return formatConversation(conversation);
  }

  async findMessages(conversationId: string, user: AuthUser, after?: string) {
    const afterDate = after ? new Date(after) : null;

    if (after && Number.isNaN(afterDate?.getTime())) {
      throw new BadRequestException('Invalid message cursor');
    }

    const conversation = await this.prisma.conversation.findFirst({
      relationLoadStrategy: 'join',
      where: {
        id: conversationId,
        participants: {
          some: {
            userId: user.id,
          },
        },
      },
      include: {
        messages: {
          where: afterDate ? { createdAt: { gt: afterDate } } : undefined,
          orderBy: [{ createdAt: afterDate ? 'asc' : 'desc' }],
          take: 100,
          include: {
            author: {
              select: userSelect,
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Update lastReadAt for the participant
    try {
      await this.prisma.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId,
            userId: user.id,
          },
        },
        data: {
          lastReadAt: new Date(),
        },
      });
    } catch (e) {
      // Ignore read receipt update error if participant doesn't exist
    }

    return afterDate ? conversation.messages : conversation.messages.reverse();
  }

  async sendMessage(
    conversationId: string,
    dto: SendMessageDto,
    author: AuthUser,
  ) {
    await this.ensureConversationAccess(conversationId, author);

    const content = dto.content.trim();

    if (!content) {
      throw new BadRequestException('Message is empty');
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        authorId: author.id,
        content,
      },
      include: {
        author: {
          select: userSelect,
        },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  private async findDirectConversation(
    firstUserId: string,
    secondUserId: string,
  ) {
    const candidates = await this.prisma.conversation.findMany({
      relationLoadStrategy: 'join',
      where: {
        isGroup: false,
        participants: {
          every: {
            userId: { in: [firstUserId, secondUserId] },
          },
        },
      },
      include: {
        ...conversationInclude,
        _count: {
          select: {
            participants: true,
          },
        },
      },
      take: 10,
    });

    const conversation = candidates.find(
      (candidate) => candidate._count.participants === 2,
    );

    return conversation ? formatConversation(conversation) : null;
  }

  private async ensureConversationAccess(
    conversationId: string,
    user: AuthUser,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: {
            userId: user.id,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
  }
}

function formatConversation<T extends { messages?: unknown[] }>(
  conversation: T,
) {
  const messages = conversation.messages ?? [];
  const rest = { ...conversation } as T & {
    messages?: unknown[];
    _count?: unknown;
  };

  delete rest.messages;
  delete rest._count;

  return {
    ...rest,
    lastMessage: messages[0] ?? null,
  };
}
