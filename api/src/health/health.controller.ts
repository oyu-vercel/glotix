import { Controller, Get } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

@Controller('health')
export class HealthController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  async check() {
    const driver = process.env.DB_DRIVER ?? 'better-sqlite3';
    const setting = await this.settings.findByKey('hello');
    return {
      status: 'ok',
      db: driver,
      setting,
    };
  }
}
