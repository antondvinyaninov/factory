import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthUser } from '../auth/auth.types';
import { TicketStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getCategories() {
    return this.prisma.ticketCategory.findMany();
  }

  async findAll(user: AuthUser, filter?: 'my' | 'all') {
    if (filter === 'all') {
      // Исполнители видят все заявки для канбана
      return this.prisma.ticket.findMany({
        include: {
          category: true,
          author: { select: { id: true, name: true, photoUrl: true } },
          assignee: { select: { id: true, name: true, photoUrl: true } },
          _count: { select: { comments: true } }
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // По умолчанию: мои заявки
    return this.prisma.ticket.findMany({
      where: { authorId: user.id },
      include: {
        category: true,
        author: { select: { id: true, name: true, photoUrl: true } },
        assignee: { select: { id: true, name: true, photoUrl: true } },
        _count: { select: { comments: true } }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        category: true,
        author: { select: { id: true, name: true, photoUrl: true } },
        assignee: { select: { id: true, name: true, photoUrl: true } },
        comments: {
          include: {
            author: { select: { id: true, name: true, photoUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Заявка не найдена');
    }

    return ticket;
  }

  async create(user: AuthUser, data: { title: string; description: string; categoryId: string }) {
    const category = await this.prisma.ticketCategory.findUnique({ where: { id: data.categoryId } });
    if (!category) throw new BadRequestException('Категория не найдена');

    const ticket = await this.prisma.ticket.create({
      data: {
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        authorId: user.id,
      },
    });

    return ticket;
  }

  async updateStatus(user: AuthUser, id: string, status: TicketStatus, assigneeId?: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Заявка не найдена');

    const updateData: any = { status };
    if (assigneeId) {
      updateData.assigneeId = assigneeId;
    } else if (status === TicketStatus.IN_PROGRESS && !ticket.assigneeId) {
      // Автоназначение на себя, если статус меняют на "В работе"
      updateData.assigneeId = user.id;
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: updateData,
    });

    // Отправляем пуш автору, если статус изменился
    if (ticket.status !== status) {
      await this.notificationsService.create(
        ticket.authorId,
        'Обновлен статус заявки',
        `Ваша заявка "${ticket.title}" переведена в статус ${status}`,
        'ticket_update',
        `/helpdesk/${ticket.id}`
      );
    }

    return updated;
  }

  async addComment(user: AuthUser, id: string, content: string) {
    const ticket = await this.findOne(id);

    const comment = await this.prisma.ticketComment.create({
      data: {
        content,
        ticketId: id,
        authorId: user.id,
      },
      include: {
        author: { select: { id: true, name: true, photoUrl: true } }
      }
    });

    // Если автор комментирует, шлем пуш исполнителю
    if (user.id === ticket.authorId && ticket.assigneeId) {
      await this.notificationsService.create(
        ticket.assigneeId,
        'Новый комментарий в заявке',
        `Автор оставил комментарий в заявке "${ticket.title}"`,
        'ticket_comment',
        `/helpdesk/${ticket.id}`
      );
    }

    // Если исполнитель (или кто-то другой) комментирует, шлем пуш автору
    if (user.id !== ticket.authorId) {
      await this.notificationsService.create(
        ticket.authorId,
        'Новый комментарий к заявке',
        `Вам ответили по заявке "${ticket.title}"`,
        'ticket_comment',
        `/helpdesk/${ticket.id}`
      );
    }

    return comment;
  }
}
