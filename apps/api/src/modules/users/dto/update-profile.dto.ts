import { WorkStatus } from '@prisma/client';

export class UpdateProfileDto {
  photoUrl?: string;
  workStatus?: WorkStatus;
  location?: string;
  bio?: string;
  skills?: any; // json
  isOnboarded?: boolean;
}
