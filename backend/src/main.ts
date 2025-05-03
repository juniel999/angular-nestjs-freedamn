import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as mongoose from 'mongoose';
import { ValidationPipe } from '@nestjs/common';
import { json } from 'express';

async function bootstrap() {
  // Connect to MongoDB with error handling
  mongoose.connection.on('error', (err) => {
    console.error(`MongoDB connection error: ${err}`);
    process.exit(1);
  });

  const app = await NestFactory.create(AppModule);

  // Configure body parser with increased limits
  app.use(json({ limit: '50mb' }));

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Enable CORS
  app.enableCors();

  // Add global API prefix
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
