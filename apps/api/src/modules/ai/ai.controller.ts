import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { AuthUser } from '../auth/auth.types';
import { AiService } from './ai.service';

const SESSION_COOKIE_NAME = 'factory_session';

type CookieCarrier = {
  cookies?: Record<string, string | undefined>;
};

function getSessionToken(request: Request): string | undefined {
  const cookies = (request as unknown as CookieCarrier).cookies;
  return cookies?.[SESSION_COOKIE_NAME];
}

@Controller('ai')
export class AiController {
  constructor(
    private readonly authService: AuthService,
    private readonly aiService: AiService,
  ) {}

  @Post('chat')
  async chat(
    @Req() request: Request,
    @Body() body: { messages: Array<{ role: 'user' | 'assistant'; content: string }>; model?: string },
  ) {
    const user = await this.getUser(request);
    
    if (!body.messages || !Array.isArray(body.messages)) {
      throw new UnauthorizedException('Invalid payload');
    }

    return this.aiService.chat(body.messages, user, body.model);
  }

  private async getUser(request: Request): Promise<AuthUser> {
    const token = getSessionToken(request);

    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    const user = await this.authService.getUserFromToken(token);
    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    return user;
  }
}
