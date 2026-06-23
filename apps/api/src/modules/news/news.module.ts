import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [NewsController],
  providers: [NewsService],
})
export class NewsModule {}
