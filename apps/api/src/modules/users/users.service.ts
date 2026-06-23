import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) throw new NotFoundException('User not found');
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;
    return result;
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        position: true,
        photoUrl: true,
      },
      orderBy: { name: 'asc' }
    });
    return users;
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        photoUrl: dto.photoUrl,
        workStatus: dto.workStatus,
        location: dto.location,
        bio: dto.bio,
        skills: dto.skills ? dto.skills : undefined,
        isOnboarded: dto.isOnboarded,
      },
    });
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = updated;
    return result;
  }
}
