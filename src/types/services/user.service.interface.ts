/**
 * User Service Interface
 */

import {
  CreateUserDto,
  UpdateUserDto,
  UpdatePasswordDto,
  UserResponseDto,
  LoginDto,
} from '../dtos/user.dto'
import { PaginationParams, PaginatedResponse } from '../models/base.types'

export interface IUserService {
  /**
   * Create a new user
   */
  createUser(data: CreateUserDto): Promise<UserResponseDto>

  /**
   * Get user by ID
   */
  getUserById(id: string): Promise<UserResponseDto | null>

  /**
   * Get user by username
   */
  getUserByUsername(username: string): Promise<UserResponseDto | null>

  /**
   * Get user by email
   */
  getUserByEmail(email: string): Promise<UserResponseDto | null>

  /**
   * Get all users with pagination
   */
  getUsers(params: PaginationParams): Promise<PaginatedResponse<UserResponseDto>>

  /**
   * Update user
   */
  updateUser(id: string, data: UpdateUserDto): Promise<UserResponseDto>

  /**
   * Update user password
   */
  updatePassword(id: string, data: UpdatePasswordDto): Promise<void>

  /**
   * Delete user
   */
  deleteUser(id: string): Promise<void>

  /**
   * Authenticate user
   */
  authenticate(data: LoginDto): Promise<{ user: UserResponseDto; token: string }>

  /**
   * Update last login timestamp
   */
  updateLastLogin(id: string): Promise<void>

  /**
   * Check if user exists
   */
  userExists(username: string, email: string): Promise<boolean>
}
