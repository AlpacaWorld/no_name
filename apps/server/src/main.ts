import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getAllowedOrigins } from './cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: getAllowedOrigins(),
  });
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
