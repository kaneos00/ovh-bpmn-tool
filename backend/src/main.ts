import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { BpmnToolAppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app =
    await NestFactory.create<NestExpressApplication>(BpmnToolAppModule);
  const configService = app.get(ConfigService);

  app.useBodyParser('json', { limit: '50mb' });
  app.useGlobalPipes(new ValidationPipe());

  // Apply this additive, idempotent schema change before serving requests.
  // SQL files in backend/migrations are not automatically executed by TypeORM.
  const dataSource = app.get(DataSource);
  await dataSource.query(
    'ALTER TABLE "contents" ADD COLUMN IF NOT EXISTS "changeComment" text NULL',
  );

  if (configService.getOrThrow<string>('env') === 'development') {
    app.enableCors();
  }

  await app.listen(configService.getOrThrow<number>('port'));
}
bootstrap();
