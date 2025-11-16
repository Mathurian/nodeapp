import { PaginationParams, PaginatedResponse } from '../models/base.types';
export interface IBaseRepository<T, CreateDto, UpdateDto> {
    findById(id: string): Promise<T | null>;
    findAll(params: PaginationParams): Promise<PaginatedResponse<T>>;
    create(data: CreateDto): Promise<T>;
    update(id: string, data: UpdateDto): Promise<T>;
    delete(id: string): Promise<void>;
    exists(id: string): Promise<boolean>;
    count(where?: any): Promise<number>;
}
//# sourceMappingURL=base.repository.interface.d.ts.map