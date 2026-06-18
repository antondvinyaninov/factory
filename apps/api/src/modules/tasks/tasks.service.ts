import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TaskPriority, TaskStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthUser } from '../auth/auth.types';
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
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser) {
    return this.prisma.task.findMany({
      where: isTaskAdmin(user)
        ? undefined
        : {
            OR: [{ creatorId: user.id }, { assigneeId: user.id }],
          },
      orderBy: [{ createdAt: 'desc' }],
      include: taskInclude,
    });
  }

  async listAssignableUsers() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  }

  async create(dto: CreateTaskDto, creator: AuthUser) {
    const payload = await this.prepareCreatePayload(dto, creator);

    return this.prisma.task.create({
      data: payload,
      include: taskInclude,
    });
  }

  async update(id: string, dto: UpdateTaskDto, user: AuthUser) {
    await this.getTaskForAccess(id, user);
    const data = await this.prepareUpdatePayload(dto);

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No task fields to update');
    }

    return this.prisma.task.update({
      where: { id },
      data,
      include: taskInclude,
    });
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
