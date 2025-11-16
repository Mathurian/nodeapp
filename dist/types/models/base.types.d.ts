export type ID = string;
export interface Timestamps {
    createdAt: Date;
    updatedAt: Date;
}
export interface BaseEntity extends Timestamps {
    id: ID;
}
export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type WithRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
export type PickRequired<T, K extends keyof T> = Pick<T, K> & Partial<Omit<T, K>>;
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        [key: string]: any;
    };
}
export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}
//# sourceMappingURL=base.types.d.ts.map