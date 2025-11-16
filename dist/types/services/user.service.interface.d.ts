import { CreateUserDto, UpdateUserDto, UpdatePasswordDto, UserResponseDto, LoginDto } from '../dtos/user.dto';
import { PaginationParams, PaginatedResponse } from '../models/base.types';
export interface IUserService {
    createUser(data: CreateUserDto): Promise<UserResponseDto>;
    getUserById(id: string): Promise<UserResponseDto | null>;
    getUserByUsername(username: string): Promise<UserResponseDto | null>;
    getUserByEmail(email: string): Promise<UserResponseDto | null>;
    getUsers(params: PaginationParams): Promise<PaginatedResponse<UserResponseDto>>;
    updateUser(id: string, data: UpdateUserDto): Promise<UserResponseDto>;
    updatePassword(id: string, data: UpdatePasswordDto): Promise<void>;
    deleteUser(id: string): Promise<void>;
    authenticate(data: LoginDto): Promise<{
        user: UserResponseDto;
        token: string;
    }>;
    updateLastLogin(id: string): Promise<void>;
    userExists(username: string, email: string): Promise<boolean>;
}
//# sourceMappingURL=user.service.interface.d.ts.map