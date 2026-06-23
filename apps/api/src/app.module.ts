import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseHealthService } from './database/database-health.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { MessagesModule } from './modules/messages/messages.module';
import { NewsModule } from './modules/news/news.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { UsersModule } from './modules/users/users.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AiModule } from './modules/ai/ai.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { WorkShiftsModule } from './modules/work-shifts/work-shifts.module';

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
    EmployeesModule,
    UsersModule,
    NotificationsModule,
    AiModule,
    DocumentsModule,
    TicketsModule,
    WorkShiftsModule,
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseHealthService],
})
export class AppModule {}
