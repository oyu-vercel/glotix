import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './setting.entity';

@Injectable()
export class SettingsService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Setting)
    private readonly repo: Repository<Setting>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const existing = await this.repo.findOneBy({ key: 'hello' });
    if (!existing) {
      await this.repo.save({ key: 'hello', value: 'world' });
    }
  }

  findByKey(key: string): Promise<Setting | null> {
    return this.repo.findOneBy({ key });
  }
}
