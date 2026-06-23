import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TaskPriority, TaskStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthUser } from '../auth/auth.types';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

const taskInclude = {
  creator: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  assignee: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(user: AuthUser) {
    return this.prisma.task.findMany({
      relationLoadStrategy: 'join',
      where: isTaskAdmin(user)
        ? undefined
        : {
            OR: [{ creatorId: user.id }, { assigneeId: user.id }],
          },
      orderBy: [{ createdAt: 'desc' }],
      take: 100,
      include: taskInclude,
    });
  }

  async listAssignableUsers() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  }

  async create(dto: CreateTaskDto, creator: AuthUser) {
    const payload = await this.prepareCreatePayload(dto, creator);

    const task = await this.prisma.task.create({
      data: payload,
      include: taskInclude,
    });

    if (task.assigneeId && task.assigneeId !== creator.id) {
      await this.notificationsService.create(
        task.assigneeId,
        'Новая задача',
        `Вам назначена задача: "${task.title}"`,
        'TASK_ASSIGNED',
        '/tasks',
      );
    }

    return task;
  }

  async update(id: string, dto: UpdateTaskDto, user: AuthUser) {
    const existingTask = await this.getTaskForAccess(id, user);
    const data = await this.prepareUpdatePayload(dto);

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No task fields to update');
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data,
      include: taskInclude,
    });

    const statusLabels: Record<TaskStatus, string> = {
      TODO: 'К выполнению',
      IN_PROGRESS: 'В работе',
      DONE: 'Готово',
      CANCELED: 'Отменено',
    };

    // 1. Notify new assignee if assignee changed
    if (data.assigneeId && data.assigneeId !== existingTask.assigneeId && data.assigneeId !== user.id) {
      await this.notificationsService.create(
        data.assigneeId,
        'Вам назначена задача',
        `Вам назначена задача: "${updatedTask.title}"`,
        'TASK_ASSIGNED',
        '/tasks',
      );
    }

    // 2. Notify about status changes
    if (data.status && data.status !== existingTask.status) {
      const statusText = statusLabels[data.status] || data.status;

      // If the updater is the assignee, notify the creator
      if (user.id === existingTask.assigneeId && existingTask.creatorId !== user.id) {
        await this.notificationsService.create(
          existingTask.creatorId,
          'Статус задачи обновлен',
          `Статус задачи "${updatedTask.title}" изменен на "${statusText}"`,
          'TASK_STATUS_CHANGED',
          '/tasks',
        );
      }

      // If the updater is the creator (or admin), notify the assignee
      if (user.id === existingTask.creatorId && existingTask.assigneeId && existingTask.assigneeId !== user.id) {
        await this.notificationsService.create(
          existingTask.assigneeId,
          'Статус задачи обновлен',
          `Статус задачи "${updatedTask.title}" изменен на "${statusText}"`,
          'TASK_STATUS_CHANGED',
          '/tasks',
        );
      }
    }

    return updatedTask;
  }

  async remove(id: string, user: AuthUser) {
    const existingTask = await this.getTaskForAccess(id, user);

    if (!isTaskAdmin(user) && existingTask.creatorId !== user.id) {
      throw new ForbiddenException('Only creator can delete this task');
    }

    await this.prisma.task.delete({ where: { id } });

    return { status: 'ok' };
  }

  private async prepareCreatePayload(dto: CreateTaskDto, creator: AuthUser) {
    const title = dto.title.trim();

    if (!title || title.length < 3) {
      throw new BadRequestException('Task title is too short');
    }

    const assigneeId = dto.assigneeId?.trim() || creator.id;
    await this.ensureAssignableUser(assigneeId);

    return {
      title,
      description: dto.description?.trim() || null,
      priority: dto.priority ?? TaskPriority.MEDIUM,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      creatorId: creator.id,
      assigneeId,
      status: TaskStatus.TODO,
    };
  }

  private async prepareUpdatePayload(dto: UpdateTaskDto) {
    const data: {
      title?: string;
      description?: string | null;
      status?: TaskStatus;
      priority?: TaskPriority;
      dueAt?: Date | null;
      assigneeId?: string | null;
    } = {};

    if (dto.title !== undefined) {
      const title = dto.title.trim();

      if (!title || title.length < 3) {
        throw new BadRequestException('Task title is too short');
      }

      data.title = title;
    }

    if (dto.description !== undefined) {
      data.description = dto.description.trim() || null;
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    if (dto.priority !== undefined) {
      data.priority = dto.priority;
    }

    if (dto.dueAt !== undefined) {
      data.dueAt = new Date(dto.dueAt);
    }

    if (dto.assigneeId !== undefined) {
      const assigneeId = dto.assigneeId.trim();

      if (assigneeId) {
        await this.ensureAssignableUser(assigneeId);
      }

      data.assigneeId = assigneeId || null;
    }

    return data;
  }

  private async ensureAssignableUser(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Task assignee is not available');
    }
  }

  private async getTaskForAccess(id: string, user: AuthUser) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
        creatorId: true,
        assigneeId: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (
      !isTaskAdmin(user) &&
      task.creatorId !== user.id &&
      task.assigneeId !== user.id
    ) {
      throw new ForbiddenException('Task is not available');
    }

    return task;
  }
}

function isTaskAdmin(user: AuthUser) {
  return user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
}
