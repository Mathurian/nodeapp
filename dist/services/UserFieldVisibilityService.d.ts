import { BaseService } from './BaseService';
interface FieldVisibility {
    visible: boolean;
    required: boolean;
}
interface FieldVisibilityConfig {
    [key: string]: FieldVisibility;
}
export declare class UserFieldVisibilityService extends BaseService {
    private getDefaultFieldVisibility;
    getFieldVisibilitySettings(): Promise<FieldVisibilityConfig>;
    updateFieldVisibility(field: string, visible: boolean, required?: boolean, userId?: string): Promise<{
        message: string;
        field: string;
        visible: boolean;
        required: boolean;
    }>;
    resetFieldVisibility(): Promise<{
        message: string;
    }>;
}
export {};
//# sourceMappingURL=UserFieldVisibilityService.d.ts.map