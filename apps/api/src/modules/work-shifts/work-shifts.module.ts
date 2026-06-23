import { Module } from '@nestjs/common';
import { WorkShiftsController } from './work-shifts.controller';
import { WorkShiftsService } from './work-shifts.service';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [WorkShiftsController],
  providers: [WorkShiftsService],
})
export class WorkShiftsModule {}
