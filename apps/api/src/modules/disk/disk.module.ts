import { Module } from '@nestjs/common';
import { DiskController } from './disk.controller';

@Module({
  controllers: [DiskController],
})
export class DiskModule {}
