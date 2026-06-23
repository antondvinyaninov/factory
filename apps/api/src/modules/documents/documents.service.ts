import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthUser } from '../auth/auth.types';
import { RouteType, DocumentStatus, ApprovalStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(user: AuthUser, data: { title: string; content: string; routeType: RouteType; approvers: string[] }) {
    if (!data.approvers || data.approvers.length === 0) {
      throw new BadRequestException('Укажите хотя бы одного согласующего');
    }

    const document = await this.prisma.document.create({
      data: {
        title: data.title,
        content: data.content,
        authorId: user.id,
        routeType: data.routeType,
        status: DocumentStatus.IN_PROGRESS,
        approvalRoute: {
          create: data.approvers.map((userId, index) => ({
            userId,
            order: index + 1,
            status: ApprovalStatus.PENDING,
          })),
        },
      },
      include: {
        approvalRoute: true,
      },
    });

    // Уведомления
    if (data.routeType === 'PARALLEL') {
      // Всем сразу
      for (const approver of document.approvalRoute) {
        await this.notificationsService.create(
          approver.userId,
          'Новый документ на подпись',
          `Поступила служебная записка "${document.title}" от ${user.name}`,
          'document_approval',
          `/documents/${document.id}`,
        );
      }
    } else {
      // Только первому
      const firstApprover = document.approvalRoute.find((a) => a.order === 1);
      if (firstApprover) {
        await this.notificationsService.create(
          firstApprover.userId,
          'Новый документ на подпись',
          `Поступила служебная записка "${document.title}" от ${user.name}`,
          'document_approval',
          `/documents/${document.id}`,
        );
      }
    }

    return document;
  }

  async findAll(user: AuthUser) {
    // Документы, которые я создал, ИЛИ в которых я в маршруте
    return this.prisma.document.findMany({
      where: {
        OR: [
          { authorId: user.id },
          { approvalRoute: { some: { userId: user.id } } },
        ],
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, photoUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true, photoUrl: true },
        },
        approvalRoute: {
          include: {
            user: {
              select: { id: true, name: true, email: true, photoUrl: true },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Документ не найден');
    }

    return document;
  }

  async approve(user: AuthUser, id: string, comment?: string) {
    return this.makeDecision(user, id, ApprovalStatus.APPROVED, comment);
  }

  async reject(user: AuthUser, id: string, comment?: string) {
    return this.makeDecision(user, id, ApprovalStatus.REJECTED, comment);
  }

  private async makeDecision(user: AuthUser, documentId: string, decision: ApprovalStatus, comment?: string) {
    const document = await this.findOne(documentId);

    if (document.status !== DocumentStatus.IN_PROGRESS) {
      throw new BadRequestException(`Документ уже в статусе ${document.status}`);
    }

    const routeItem = document.approvalRoute.find((a) => a.userId === user.id);
    if (!routeItem) {
      throw new BadRequestException('Вы не являетесь согласующим этого документа');
    }

    if (routeItem.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(`Вы уже приняли решение: ${routeItem.status}`);
    }

    // Проверка очереди для последовательного согласования
    if (document.routeType === 'SEQUENTIAL') {
      const pendingBeforeMe = document.approvalRoute.find(
        (a) => a.order < routeItem.order && a.status === ApprovalStatus.PENDING
      );
      if (pendingBeforeMe) {
        throw new BadRequestException('Еще не ваша очередь согласовывать этот документ');
      }
    }

    // Обновляем статус в маршруте
    await this.prisma.approvalRouteItem.update({
      where: { id: routeItem.id },
      data: {
        status: decision,
        comment,
        decidedAt: new Date(),
      },
    });

    // Перепроверяем состояние всего документа
    const updatedDocument = await this.findOne(documentId);
    
    if (decision === ApprovalStatus.REJECTED) {
      // Если кто-то отклонил, документ отклонен
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.REJECTED },
      });
      // Уведомляем автора
      await this.notificationsService.create(
        updatedDocument.authorId,
        'Документ отклонён',
        `Служебная записка "${updatedDocument.title}" была отклонена.`,
        'document_rejected',
        `/documents/${documentId}`,
      );
    } else {
      // Согласовано. Проверяем, есть ли еще ожидающие
      const stillPending = updatedDocument.approvalRoute.some((a) => a.status === ApprovalStatus.PENDING);
      
      if (!stillPending) {
        // Все согласовали
        await this.prisma.document.update({
          where: { id: documentId },
          data: { status: DocumentStatus.APPROVED },
        });
        // Уведомляем автора
        await this.notificationsService.create(
          updatedDocument.authorId,
          'Документ согласован',
          `Служебная записка "${updatedDocument.title}" полностью согласована!`,
          'document_approved',
          `/documents/${documentId}`,
        );
      } else if (updatedDocument.routeType === 'SEQUENTIAL') {
        // Уведомляем следующего в очереди
        const nextApprover = updatedDocument.approvalRoute.find(
          (a) => a.order > routeItem.order && a.status === ApprovalStatus.PENDING
        );
        if (nextApprover) {
          await this.notificationsService.create(
            nextApprover.userId,
            'Документ на подпись',
            `Поступила служебная записка "${updatedDocument.title}" от ${updatedDocument.author.name}`,
            'document_approval',
            `/documents/${documentId}`,
          );
        }
      }
    }

    return this.findOne(documentId);
  }
}
