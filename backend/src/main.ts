import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const corsOrigins = configService.get<string[]>('app.corsOrigins', [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]);

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id'],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SUE Backend API')
    .setDescription(
      'Backend API for auth, sync, QC, records, and export workflows',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('docs', app, swaggerDocument);

  logger.log(`Starting HTTP server on 0.0.0.0:${port}`);
  await app.listen(port, '0.0.0.0');
  logger.log(`HTTP server is listening on 0.0.0.0:${port}`);
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection during runtime:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception during runtime:', error);
});

bootstrap().catch((error) => {
  console.error('Fatal bootstrap error:', error);
  process.exit(1);
});
