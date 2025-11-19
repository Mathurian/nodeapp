/**
 * User Repository
 * Data access layer for User entity
 */

import { User, Prisma } from '@prisma/client';
import { injectable } from 'tsyringe';
import { BaseRepository, PaginationOptions, PaginatedResult } from './BaseRepository';

// Type for User with common relations
export type UserWithRelations = User & {
  judge?: unknown | null;
  contestant?: unknown | null;
  assignedAssignments?: Array<{ eventId: string; [key: string]: unknown }>;
  [key: string]: unknown;
};

@injectable()
export class UserRepository extends BaseRepository<User> {
  protected getModelName(): string {
    return 'user';
  }

  /**
   * Find user by name
   */
  async findByName(name: string): Promise<User | null> {
    return this.findFirst({ name });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.findFirst({ email });
  }

  /**
   * Find user by name or email
   */
  async findByNameOrEmail(nameOrEmail: string): Promise<User | null> {
    return this.findFirst({
      OR: [
        { name: nameOrEmail },
        { email: nameOrEmail }
      ]
    });
  }

  /**
   * Find users by role
   */
  async findByRole(role: string): Promise<User[]> {
    return this.findMany({ role });
  }

  /**
   * Find active users
   */
  async findActiveUsers(): Promise<User[]> {
    return this.findMany({
      isActive: true,
      archived: false
    });
  }

  /**
   * Find users with assignments for an event
   */
  async findUsersWithAssignments(eventId: string): Promise<UserWithRelations[]> {
    return this.getModel().findMany({
      where: {
        assignedAssignments: { some: { eventId } }
      },
      include: {
        assignedAssignments: {
          where: { eventId }
        },
        contestant: true,
        judge: true
      }
    }) as Promise<UserWithRelations[]>;
  }

  /**
   * Search users by name or email
   */
  async searchUsers(query: string): Promise<User[]> {
    return this.findMany({
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { preferredName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } }
      ]
    });
  }

  /**
   * Update user last login
   */
  async updateLastLogin(userId: string): Promise<User> {
    return this.update(userId, {
      lastLoginAt: new Date()
    });
  }

  /**
   * Update user password
   */
  async updatePassword(userId: string, hashedPassword: string): Promise<User> {
    return this.update(userId, {
      password: hashedPassword
    });
  }

  /**
   * Toggle user active status
   */
  async toggleActiveStatus(userId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return this.update(userId, {
      isActive: !user.isActive
    });
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<{
    totalAssignments: number;
    eventsParticipated: number;
  }> {
    const user = await this.getModel().findUnique({
      where: { id: userId },
      include: {
        assignedAssignments: {
          distinct: ['eventId']
        }
      }
    });

    if (!user) {
      return {
        totalAssignments: 0,
        eventsParticipated: 0
      };
    }

    const eventIds = new Set([
      ...user.assignedAssignments.map((a: { eventId: string }) => a.eventId)
    ]);

    return {
      totalAssignments: user.assignedAssignments.length,
      eventsParticipated: eventIds.size
    };
  }

  /**
   * Find all users with pagination
   */
  async findAllPaginated(options: PaginationOptions): Promise<PaginatedResult<User>> {
    return this.findManyPaginated({}, options);
  }

  /**
   * Find active users with pagination
   */
  async findActiveUsersPaginated(options: PaginationOptions): Promise<PaginatedResult<User>> {
    return this.findManyPaginated(
      {
        isActive: true,
        archived: false
      },
      options
    );
  }

  /**
   * Find users by role with pagination
   */
  async findByRolePaginated(role: string, options: PaginationOptions): Promise<PaginatedResult<User>> {
    return this.findManyPaginated({ role }, options);
  }

  /**
   * Search users with pagination
   */
  async searchUsersPaginated(query: string, options: PaginationOptions): Promise<PaginatedResult<User>> {
    return this.findManyPaginated({
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { preferredName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } }
      ]
    }, options);
  }
}
