import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

const SESSION_COOKIE_NAME = 'factory_session';
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 8;

function isCookieSecure(): boolean {
  if (process.env.COOKIE_SECURE) {
    return process.env.COOKIE_SECURE === 'true';
  }

  return process.env.NODE_ENV === 'production';
}

type CookieCarrier = {
  cookies?: Record<string, string | undefined>;
};

function getSessionToken(request: Request): string | undefined {
  const cookies = (request as unknown as CookieCarrier).cookies;
  return cookies?.[SESSION_COOKIE_NAME];
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto);

    response.cookie(SESSION_COOKIE_NAME, result.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isCookieSecure(),
      maxAge: SESSION_MAX_AGE_MS,
      path: '/',
    });

    return { user: result.user };
  }

  @Get('me')
  async me(@Req() request: Request) {
    const token = getSessionToken(request);

    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    return { user: await this.authService.getUserFromToken(token) };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(SESSION_COOKIE_NAME, {
      sameSite: 'lax',
      secure: isCookieSecure(),
      path: '/',
    });
    return { status: 'ok' };
  }
}
