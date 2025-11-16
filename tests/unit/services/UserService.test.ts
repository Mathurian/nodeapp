/**
 * UserService Unit Tests
 */

import 'reflect-metadata';
import { UserService, CreateUserDTO, UpdateUserDTO, ChangePasswordDTO } from '../../../src/services/UserService';
import { UserRepository } from '../../../src/repositories/UserRepository';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import { ConflictError, ValidationError, NotFoundError } from '../../../src/services/BaseService';
import { createMockUser } from '../../helpers/mockData';

// Mock dependencies
jest.mock('bcrypt');
jest.mock('../../../src/utils/cache', () => ({
  invalidateCache: jest.fn().mockResolvedValue(undefined)
}));

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  // Sample user data
  const mockUser = createMockUser();

  beforeEach(() => {
    // Create mock repository with all methods
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByName: jest.fn(),
      findByRole: jest.fn(),
      findAll: jest.fn(),
      findActiveUsers: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      searchUsers: jest.fn(),
      getUserStats: jest.fn(),
      updatePassword: jest.fn(),
      toggleActiveStatus: jest.fn(),
    } as any;

    // Create service instance with mocked repository
    userService = new UserService(mockUserRepository);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should return all users without passwords', async () => {
      const users = [mockUser, createMockUser({ id: 'user-456', name: 'user2' })];
      mockUserRepository.findAll.mockResolvedValue(users);

      const result = await userService.getAllUsers();

      expect(mockUserRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('password');
      expect(result[1]).not.toHaveProperty('password');
    });

    it('should handle repository errors', async () => {
      mockUserRepository.findAll.mockRejectedValue(new Error('Database error'));

      await expect(userService.getAllUsers()).rejects.toThrow();
    });
  });

  describe('getActiveUsers', () => {
    it('should return only active users', async () => {
      const activeUsers = [mockUser];
      mockUserRepository.findActiveUsers.mockResolvedValue(activeUsers);

      const result = await userService.getActiveUsers();

      expect(mockUserRepository.findActiveUsers).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('password');
    });
  });

  describe('getUserById', () => {
    it('should return user by id without password', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.getUserById('user-123');

      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
      expect(result).not.toHaveProperty('password');
      expect(result.id).toBe('user-123');
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.getUserById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by email', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await userService.getUserByEmail('test@example.com');

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(result).not.toHaveProperty('password');
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const result = await userService.getUserByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('getUserByName', () => {
    it('should return user by name', async () => {
      mockUserRepository.findByName.mockResolvedValue(mockUser);

      const result = await userService.getUserByName('testuser');

      expect(mockUserRepository.findByName).toHaveBeenCalledWith('testuser');
      expect(result).not.toHaveProperty('password');
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findByName.mockResolvedValue(null);

      const result = await userService.getUserByName('notfound');

      expect(result).toBeNull();
    });
  });

  describe('getUsersByRole', () => {
    it('should return users by role', async () => {
      const adminUsers = [mockUser, createMockUser({ id: 'user-456' })];
      mockUserRepository.findByRole.mockResolvedValue(adminUsers);

      const result = await userService.getUsersByRole('admin');

      expect(mockUserRepository.findByRole).toHaveBeenCalledWith('admin');
      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('password');
    });
  });

  describe('createUser', () => {
    const createUserDTO: CreateUserDTO = {
      name: 'newuser',
      email: 'new@example.com',
      password: 'password123',
      role: UserRole.JUDGE,
      preferredName: 'New User'
    };

    beforeEach(() => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    });

    it('should create user with valid data', async () => {
      mockUserRepository.findByName.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await userService.createUser(createUserDTO);

      expect(mockUserRepository.findByName).toHaveBeenCalledWith('newuser');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('new@example.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        name: 'newuser',
        email: 'new@example.com',
        password: 'hashed-password',
        preferredName: 'New User',
        role: UserRole.JUDGE,
        isActive: true
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should throw ValidationError for invalid email', async () => {
      const invalidDTO = { ...createUserDTO, email: 'invalid-email' };

      await expect(userService.createUser(invalidDTO)).rejects.toThrow(ValidationError);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for short password', async () => {
      const shortPasswordDTO = { ...createUserDTO, password: 'short' };

      await expect(userService.createUser(shortPasswordDTO)).rejects.toThrow(ValidationError);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictError when name already exists', async () => {
      mockUserRepository.findByName.mockResolvedValue(mockUser);
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(userService.createUser(createUserDTO)).rejects.toThrow(ConflictError);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictError when email already exists', async () => {
      mockUserRepository.findByName.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(userService.createUser(createUserDTO)).rejects.toThrow(ConflictError);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    const updateUserDTO: UpdateUserDTO = {
      name: 'updateduser',
      email: 'updated@example.com',
      role: UserRole.ADMIN
    };

    it('should update user successfully', async () => {
      const updatedUser = createMockUser({
        name: 'updateduser',
        email: 'updated@example.com',
        role: UserRole.ADMIN
      });
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findByName.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUser('user-123', updateUserDTO);

      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
      expect(mockUserRepository.update).toHaveBeenCalledWith('user-123', updateUserDTO);
      expect(result).not.toHaveProperty('password');
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.updateUser('nonexistent', updateUserDTO)).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when updating to existing name', async () => {
      const otherUser = createMockUser({ id: 'other-user', name: 'updateduser' });
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findByName.mockResolvedValue(otherUser);

      await expect(userService.updateUser('user-123', updateUserDTO)).rejects.toThrow(ConflictError);
    });

    it('should throw ValidationError for invalid email format', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      const invalidDTO = { email: 'invalid-email' };

      await expect(userService.updateUser('user-123', invalidDTO)).rejects.toThrow(ValidationError);
    });

    it('should allow updating to same name/email', async () => {
      const sameDataDTO: UpdateUserDTO = {
        name: mockUser.name,
        email: mockUser.email
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(mockUser);

      await userService.updateUser('user-123', sameDataDTO);

      expect(mockUserRepository.findByName).not.toHaveBeenCalled();
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
      expect(mockUserRepository.update).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    const changePasswordDTO: ChangePasswordDTO = {
      currentPassword: 'oldpassword',
      newPassword: 'newpassword123'
    };

    beforeEach(() => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
    });

    it('should change password successfully', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePassword.mockResolvedValue(mockUser);

      await userService.changePassword('user-123', changePasswordDTO);

      expect(bcrypt.compare).toHaveBeenCalledWith('oldpassword', 'hashed-password');
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(mockUserRepository.updatePassword).toHaveBeenCalledWith('user-123', 'new-hashed-password');
    });

    it('should throw ValidationError when current password is incorrect', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(userService.changePassword('user-123', changePasswordDTO)).rejects.toThrow(ValidationError);
      expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when new password is too short', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      const shortPasswordDTO = { ...changePasswordDTO, newPassword: 'short' };

      await expect(userService.changePassword('user-123', shortPasswordDTO)).rejects.toThrow(ValidationError);
      expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.changePassword('nonexistent', changePasswordDTO)).rejects.toThrow(NotFoundError);
    });
  });

  describe('toggleUserActiveStatus', () => {
    it('should toggle user active status', async () => {
      const toggledUser = createMockUser({ isActive: false });
      mockUserRepository.toggleActiveStatus.mockResolvedValue(toggledUser);

      const result = await userService.toggleUserActiveStatus('user-123');

      expect(mockUserRepository.toggleActiveStatus).toHaveBeenCalledWith('user-123');
      expect(result).not.toHaveProperty('password');
      expect(result.isActive).toBe(false);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.delete.mockResolvedValue(undefined);

      await userService.deleteUser('user-123');

      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
      expect(mockUserRepository.delete).toHaveBeenCalledWith('user-123');
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.deleteUser('nonexistent')).rejects.toThrow(NotFoundError);
      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('searchUsers', () => {
    it('should search users by query', async () => {
      const searchResults = [mockUser];
      mockUserRepository.searchUsers.mockResolvedValue(searchResults);

      const result = await userService.searchUsers('test');

      expect(mockUserRepository.searchUsers).toHaveBeenCalledWith('test');
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('password');
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const stats = {
        totalAssignments: 10,
        eventsParticipated: 5
      };
      mockUserRepository.getUserStats.mockResolvedValue(stats);

      const result = await userService.getUserStats('user-123');

      expect(mockUserRepository.getUserStats).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(stats);
    });
  });
});
