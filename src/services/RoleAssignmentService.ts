import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient, Prisma } from '@prisma/client';

interface RoleAssignmentFilters {
  tenantId: string;
  role?: string;
  contestId?: string;
  eventId?: string;
  categoryId?: string;
}

interface CreateRoleAssignmentDto {
  tenantId: string;
  userId: string;
  role: string;
  contestId?: string;
  eventId?: string;
  categoryId?: string;
  notes?: string;
  assignedBy: string;
}

interface UpdateRoleAssignmentDto {
  tenantId: string;
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
    const whereClause: Prisma.RoleAssignmentWhereInput = {
      tenantId: filters.tenantId,
    };

    if (filters.role) whereClause.role = filters.role;
    if (filters.contestId) whereClause.contestId = filters.contestId;
    if (filters.eventId) whereClause.eventId = filters.eventId;
    if (filters.categoryId) whereClause.categoryId = filters.categoryId;

    return await this.prisma.roleAssignment.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ assignedAt: 'desc' }]
    });
  }

  async create(data: CreateRoleAssignmentDto) {
    if (!data.tenantId || !data.userId || !data.role) {
      throw this.badRequestError('tenantId, userId and role are required');
    }

    if (!data.contestId && !data.eventId && !data.categoryId) {
      throw this.badRequestError('At least one of contestId, eventId, or categoryId is required');
    }

    if (!this.VALID_ROLES.includes(data.role)) {
      throw this.badRequestError('Invalid role');
    }

    const user = await this.prisma.user.findFirst({ where: { id: data.userId, tenantId: data.tenantId } });
    if (!user) throw this.notFoundError('User', data.userId);

    if (data.contestId) {
      const contest = await this.prisma.contest.findFirst({
        where: { id: data.contestId, tenantId: data.tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!contest) throw this.notFoundError('Contest', data.contestId);
    }

    if (data.eventId) {
      const event = await this.prisma.event.findFirst({
        where: { id: data.eventId, tenantId: data.tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!event) throw this.notFoundError('Event', data.eventId);
    }

    if (data.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: data.categoryId, tenantId: data.tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!category) throw this.notFoundError('Category', data.categoryId);
    }

    const existingAssignment = await this.prisma.roleAssignment.findFirst({
      where: {
        tenantId: data.tenantId,
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
        tenantId: data.tenantId,
        userId: data.userId,
        role: data.role,
        contestId: data.contestId || null,
        eventId: data.eventId || null,
        categoryId: data.categoryId || null,
        notes: data.notes?.trim() || null,
        assignedBy: data.assignedBy
      }
    });
  }

  async update(id: string, data: UpdateRoleAssignmentDto) {
    const assignment = await this.prisma.roleAssignment.findFirst({
      where: { id, tenantId: data.tenantId },
    });
    if (!assignment) throw this.notFoundError('Assignment', id);

    return await this.prisma.roleAssignment.update({
      where: { id },
      data: {
        ...(data.notes !== undefined && { notes: data.notes.trim() || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      }
    });
  }

  async delete(id: string, tenantId: string) {
    const assignment = await this.prisma.roleAssignment.findFirst({
      where: { id, tenantId },
    });
    if (!assignment) throw this.notFoundError('Assignment', id);
    await this.prisma.roleAssignment.delete({ where: { id } });
  }
}
