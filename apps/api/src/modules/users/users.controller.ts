import { Controller, Get, Patch, Param, Body, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthService } from '../auth/auth.service';

const SESSION_COOKIE_NAME = 'factory_session';

type CookieCarrier = {
  cookies?: Record<string, string | undefined>;
};

function getSessionToken(request: Request): string | undefined {
  const cookies = (request as unknown as CookieCarrier).cookies;
  return cookies?.[SESSION_COOKIE_NAME];
}

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService
  ) {}

  @Patch('me')
  async updateMe(@Req() request: Request, @Body() dto: UpdateProfileDto) {
    const token = getSessionToken(request);
    if (!token) throw new UnauthorizedException('Unauthorized');
    
    const currentUser = await this.authService.getUserFromToken(token);
    if (!currentUser) throw new UnauthorizedException('Unauthorized');

    return this.usersService.updateProfile(currentUser.id, dto);
  }

  @Get()
  async findAll(@Req() request: Request) {
    const token = getSessionToken(request);
    if (!token) throw new UnauthorizedException('Unauthorized');
    const currentUser = await this.authService.getUserFromToken(token);
    if (!currentUser) throw new UnauthorizedException('Unauthorized');

    return this.usersService.findAll();
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
