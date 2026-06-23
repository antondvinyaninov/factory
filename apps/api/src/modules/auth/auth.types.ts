import { UserRole } from '@prisma/client';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isOnboarded: boolean;
};

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
};
