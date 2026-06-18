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
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { AuthUser } from '../auth/auth.types';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

const SESSION_COOKIE_NAME = 'factory_session';

type CookieCarrier = {
  cookies?: Record<string, string | undefined>;
};

function getSessionToken(request: Request): string | undefined {
  const cookies = (request as unknown as CookieCarrier).cookies;
  return cookies?.[SESSION_COOKIE_NAME];
}

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly authService: AuthService,
    private readonly tasksService: TasksService,
  ) {}

  @Get()
  async findAll(@Req() request: Request) {
    return {
      items: await this.tasksService.findAll(await this.getUser(request)),
    };
  }

  @Get('users')
  async listAssignableUsers(@Req() request: Request) {
    await this.getUser(request);
    return { items: await this.tasksService.listAssignableUsers() };
  }

  @Post()
  async create(@Req() request: Request, @Body() dto: CreateTaskDto) {
    return {
      item: await this.tasksService.create(dto, await this.getUser(request)),
    };
  }

  @Patch(':id')
  async update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return {
      item: await this.tasksService.update(
        id,
        dto,
        await this.getUser(request),
      ),
    };
  }

  @Delete(':id')
  async remove(@Req() request: Request, @Param('id') id: string) {
    return this.tasksService.remove(id, await this.getUser(request));
  }

  private async getUser(request: Request): Promise<AuthUser> {
    const token = getSessionToken(request);

    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.authService.getUserFromToken(token);
  }
}
