/**
 * User Repository Interface
 */

import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../dtos/user.dto'
import { IBaseRepository } from './base.repository.interface'

export interface IUserRepository extends IBaseRepository<UserResponseDto, CreateUserDto, UpdateUserDto> {
  /**
   * Find user by username
   */
  findByUsername(username: string): Promise<UserResponseDto | null>

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<UserResponseDto | null>

  /**
   * Find users by role
   */
  findByRole(role: string): Promise<UserResponseDto[]>

  /**
   * Update user password
   */
  updatePassword(id: string, hashedPassword: string): Promise<void>

  /**
   * Update last login timestamp
   */
  updateLastLogin(id: string): Promise<void>

  /**
   * Find active users
   */
  findActiveUsers(): Promise<UserResponseDto[]>

  /**
   * Check if username exists
   */
  usernameExists(username: string, excludeId?: string): Promise<boolean>

  /**
   * Check if email exists
   */
  emailExists(email: string, excludeId?: string): Promise<boolean>
}
