import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';

interface RoleAssignmentFilters {
  role?: string;
  contestId?: string;
  eventId?: string;
  categoryId?: string;
}

interface CreateRoleAssignmentDto {
  userId: string;
  role: string;
  contestId?: string;
  eventId?: string;
  categoryId?: string;
  notes?: string;
  assignedBy: string;
}

interface UpdateRoleAssignmentDto {
  notes?: string;
  isActive?: boolean;
}

@injectable()
export class RoleAssignmentService extends BaseService {
  private readonly VALID_ROLES = ['BOARD', 'TALLY_MASTER', 'AUDITOR'];

  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  async getAll(filters: RoleAssignmentFilters) {
    const whereClause: any = {};

    if (filters.role) whereClause.role = filters.role;
    if (filters.contestId) whereClause.contestId = filters.contestId;
    if (filters.eventId) whereClause.eventId = filters.eventId;
    if (filters.categoryId) whereClause.categoryId = filters.categoryId;

    return await this.prisma.roleAssignment.findMany({
      where: whereClause,
      orderBy: [{ assignedAt: 'desc' }]
    });
  }

  async create(data: CreateRoleAssignmentDto) {
    if (!data.userId || !data.role) {
      throw this.badRequestError('userId and role are required');
    }

    if (!data.contestId && !data.eventId && !data.categoryId) {
      throw this.badRequestError('At least one of contestId, eventId, or categoryId is required');
    }

    if (!this.VALID_ROLES.includes(data.role)) {
      throw this.badRequestError('Invalid role');
    }

    const user = await this.prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) throw this.notFoundError('User', data.userId);

    const existingAssignment = await this.prisma.roleAssignment.findFirst({
      where: {
        userId: data.userId,
        role: data.role,
        contestId: data.contestId || null,
        eventId: data.eventId || null,
        categoryId: data.categoryId || null,
        isActive: true
      }
    });

    if (existingAssignment) {
      throw this.badRequestError('This assignment already exists');
    }

    return await this.prisma.roleAssignment.create({
      data: {
        tenantId: '', // Will be set by middleware
        userId: data.userId,
        role: data.role,
        contestId: data.contestId || null,
        eventId: data.eventId || null,
        categoryId: data.categoryId || null,
        assignedBy: data.assignedBy
      }
    });
  }

  async update(id: string, data: UpdateRoleAssignmentDto) {
    const assignment = await this.prisma.roleAssignment.findUnique({ where: { id } });
    if (!assignment) throw this.notFoundError('Assignment', id);

    return await this.prisma.roleAssignment.update({
      where: { id },
      data: {
        ...(data.isActive !== undefined && { isActive: data.isActive })
      }
    });
  }

  async delete(id: string) {
    const assignment = await this.prisma.roleAssignment.findUnique({ where: { id } });
    if (!assignment) throw this.notFoundError('Assignment', id);
    await this.prisma.roleAssignment.delete({ where: { id } });
  }
}
