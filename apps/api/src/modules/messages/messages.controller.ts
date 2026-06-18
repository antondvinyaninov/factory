import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { AuthUser } from '../auth/auth.types';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessagesService } from './messages.service';

const SESSION_COOKIE_NAME = 'factory_session';

type CookieCarrier = {
  cookies?: Record<string, string | undefined>;
};

function getSessionToken(request: Request): string | undefined {
  const cookies = (request as unknown as CookieCarrier).cookies;
  return cookies?.[SESSION_COOKIE_NAME];
}

@Controller('messages')
export class MessagesController {
  constructor(
    private readonly authService: AuthService,
    private readonly messagesService: MessagesService,
  ) {}

  @Get('users')
  async listUsers(@Req() request: Request) {
    return {
      items: await this.messagesService.listUsers(await this.getUser(request)),
    };
  }

  @Get('conversations')
  async findConversations(@Req() request: Request) {
    return {
      items: await this.messagesService.findConversations(
        await this.getUser(request),
      ),
    };
  }

  @Post('conversations')
  async createConversation(
    @Req() request: Request,
    @Body() dto: CreateConversationDto,
  ) {
    return {
      item: await this.messagesService.createConversation(
        dto,
        await this.getUser(request),
      ),
    };
  }

  @Get('conversations/:id/messages')
  async findMessages(
    @Req() request: Request,
    @Param('id') id: string,
    @Query('after') after?: string,
  ) {
    return {
      items: await this.messagesService.findMessages(
        id,
        await this.getUser(request),
        after,
      ),
    };
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return {
      item: await this.messagesService.sendMessage(
        id,
        dto,
        await this.getUser(request),
      ),
    };
  }

  private async getUser(request: Request): Promise<AuthUser> {
    const token = getSessionToken(request);

    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.authService.getUserFromToken(token);
  }
}
