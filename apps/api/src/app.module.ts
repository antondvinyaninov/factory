import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseHealthService } from './database/database-health.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { MessagesModule } from './modules/messages/messages.module';
import { NewsModule } from './modules/news/news.module';
import { TasksModule } from './modules/tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env', 'apps/api/.env'],
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    NewsModule,
    TasksModule,
    MessagesModule,
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseHealthService],
})
export class AppModule {}
