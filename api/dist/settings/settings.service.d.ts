import { OnApplicationBootstrap } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Setting } from './setting.entity';
export declare class SettingsService implements OnApplicationBootstrap {
    private readonly repo;
    constructor(repo: Repository<Setting>);
    onApplicationBootstrap(): Promise<void>;
    findByKey(key: string): Promise<Setting | null>;
}
