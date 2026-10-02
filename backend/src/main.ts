import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { BpmnToolAppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(BpmnToolAppModule);
  const configService = app.get(ConfigService);

  app.useBodyParser('json', { limit: '50mb' });
  app.useGlobalPipes(new ValidationPipe());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('BPMN Tool REST API')
    .setDescription('Versioned REST API for BPMN resources, contents and comments.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  if (configService.getOrThrow<string>('env') === 'development') app.enableCors();
  await app.listen(configService.getOrThrow<number>('port'));
}
bootstrap();
