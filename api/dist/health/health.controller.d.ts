import { SettingsService } from '../settings/settings.service';
export declare class HealthController {
    private readonly settings;
    constructor(settings: SettingsService);
    check(): Promise<{
        status: string;
        db: string;
        setting: import("../settings/setting.entity").Setting | null;
    }>;
}
