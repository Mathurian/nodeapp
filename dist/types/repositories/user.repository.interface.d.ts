import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../dtos/user.dto';
import { IBaseRepository } from './base.repository.interface';
export interface IUserRepository extends IBaseRepository<UserResponseDto, CreateUserDto, UpdateUserDto> {
    findByUsername(username: string): Promise<UserResponseDto | null>;
    findByEmail(email: string): Promise<UserResponseDto | null>;
    findByRole(role: string): Promise<UserResponseDto[]>;
    updatePassword(id: string, hashedPassword: string): Promise<void>;
    updateLastLogin(id: string): Promise<void>;
    findActiveUsers(): Promise<UserResponseDto[]>;
    usernameExists(username: string, excludeId?: string): Promise<boolean>;
    emailExists(email: string, excludeId?: string): Promise<boolean>;
}
//# sourceMappingURL=user.repository.interface.d.ts.map