import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { AuthUser, JwtPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';

const USER_CACHE_TTL_MS = 15_000;

type CachedAuthUser = {
  expiresAt: number;
  user: AuthUser;
};

@Injectable()
export class AuthService {
  private readonly userCache = new Map<string, CachedAuthUser>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isOnboarded: user.isOnboarded,
    };

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: authUser,
    };
  }

  async getUserFromToken(token: string): Promise<AuthUser> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const now = Date.now();
      const cachedUser = this.userCache.get(payload.sub);

      if (cachedUser && cachedUser.expiresAt > now) {
        return cachedUser.user;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          isOnboarded: true,
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Unauthorized');
      }

      const authUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isOnboarded: user.isOnboarded,
      };

      this.userCache.set(user.id, {
        expiresAt: now + USER_CACHE_TTL_MS,
        user: authUser,
      });

      return authUser;
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
  }
}
