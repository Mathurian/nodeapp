import { PrismaClient, CustomField, CustomFieldValue } from '@prisma/client';
export type CustomFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTISELECT' | 'CHECKBOX' | 'TEXTAREA' | 'EMAIL' | 'PHONE' | 'URL';
export interface CreateCustomFieldDTO {
    name: string;
    key: string;
    type: CustomFieldType;
    entityType: string;
    required?: boolean;
    defaultValue?: string;
    options?: any;
    validation?: any;
    order?: number;
    active?: boolean;
    tenantId: string;
}
export interface UpdateCustomFieldDTO {
    name?: string;
    type?: CustomFieldType;
    required?: boolean;
    defaultValue?: string;
    options?: any;
    validation?: any;
    order?: number;
    active?: boolean;
}
export interface SetCustomFieldValueDTO {
    fieldId: string;
    entityId: string;
    value: string;
}
export declare class CustomFieldService {
    private prisma;
    constructor(prisma: PrismaClient);
    createCustomField(data: CreateCustomFieldDTO): Promise<CustomField>;
    getCustomFieldsByEntityType(entityType: string, activeOnly?: boolean): Promise<CustomField[]>;
    getCustomFieldById(id: string): Promise<CustomField | null>;
    getCustomFieldByKey(key: string, entityType: string): Promise<CustomField | null>;
    updateCustomField(id: string, data: UpdateCustomFieldDTO): Promise<CustomField>;
    deleteCustomField(id: string): Promise<void>;
    setCustomFieldValue(data: SetCustomFieldValueDTO): Promise<CustomFieldValue>;
    getCustomFieldValues(entityId: string, entityType: string): Promise<CustomFieldValue[]>;
    getCustomFieldValue(fieldId: string, entityId: string): Promise<CustomFieldValue | null>;
    deleteCustomFieldValue(fieldId: string, entityId: string): Promise<void>;
    bulkSetCustomFieldValues(entityId: string, values: Record<string, string>): Promise<void>;
    validateCustomFieldValue(field: CustomField, value: string): {
        valid: boolean;
        error?: string;
    };
    reorderCustomFields(fieldIds: string[], entityType: string): Promise<void>;
}
//# sourceMappingURL=CustomFieldService.d.ts.map