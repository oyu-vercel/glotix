import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';

function buildTypeOrmOptions(): TypeOrmModuleOptions {
  const driver = process.env.DB_DRIVER ?? 'better-sqlite3';

  if (driver === 'postgres') {
    return {
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASS ?? '',
      database: process.env.DB_NAME ?? 'glotix',
      autoLoadEntities: true,
      synchronize: false,
    };
  }

  return {
    type: 'better-sqlite3',
    database: process.env.DB_FILE ?? 'glotix.dev.db',
    autoLoadEntities: true,
    synchronize: true,
  };
}

@Module({
  imports: [TypeOrmModule.forRoot(buildTypeOrmOptions()), HealthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
