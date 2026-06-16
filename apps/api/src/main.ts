import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import express from 'express';
import { AppModule } from './app.module';
import { getUploadsRoot } from './modules/news/news-attachments';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.use('/uploads', express.static(getUploadsRoot()));
  app.enableCors({
    origin: process.env.WEB_ORIGIN?.split(',').map((origin) =>
      origin.trim(),
    ) ?? ['http://localhost:3000'],
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
