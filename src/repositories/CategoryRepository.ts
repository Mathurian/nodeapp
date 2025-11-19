/**
 * Category Repository
 * Data access layer for Category entity
 */

import { Category } from '@prisma/client';
import { injectable } from 'tsyringe';
import { BaseRepository, PaginationOptions, PaginatedResult } from './BaseRepository';

@injectable()
export class CategoryRepository extends BaseRepository<Category> {
  protected getModelName(): string {
    return 'category';
  }

  /**
   * Find categories by contest ID
   * Excludes categories from contests that belong to archived events
   */
  async findByContestId(contestId: string): Promise<Category[]> {
    return this.findMany(
      {
        contestId,
        contest: {
          event: {
            archived: false
          }
        }
      },
      { orderBy: { createdAt: 'asc' } }
    );
  }

  /**
   * Find category with full details
   */
  async findCategoryWithDetails(categoryId: string): Promise<any> {
    return (this.getModel() as any).findUnique({
      where: { id: categoryId },
      include: {
        contest: {
          include: {
            event: true,
          },
        },
        criteria: true,
        judges: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                preferredName: true,
              },
            },
          },
        },
        contestants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                preferredName: true,
                contestantNumber: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Search categories by name
   */
  async searchCategories(query: string): Promise<Category[]> {
    return this.findMany({
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    });
  }

  /**
   * Get category statistics
   */
  async getCategoryStats(categoryId: string): Promise<{
    totalContestants: number;
    totalJudges: number;
    totalCriteria: number;
  }> {
    const category = await (this.getModel() as any).findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: {
            contestants: true,
            judges: true,
            criteria: true,
          },
        },
      },
    });

    if (!category) {
      return {
        totalContestants: 0,
        totalJudges: 0,
        totalCriteria: 0,
      };
    }

    return {
      totalContestants: (category as any)._count.contestants,
      totalJudges: (category as any)._count.judges,
      totalCriteria: (category as any)._count.criteria,
    };
  }

  /**
   * Certify category totals
   */
  async certifyTotals(categoryId: string, certified: boolean): Promise<Category> {
    return this.update(categoryId, { totalsCertified: certified });
  }

  /**
   * Find all categories with pagination
   */
  async findAllPaginated(options: PaginationOptions): Promise<PaginatedResult<Category>> {
    return this.findManyPaginated({}, options);
  }

  /**
   * Find categories by contest with pagination
   */
  async findByContestIdPaginated(contestId: string, options: PaginationOptions): Promise<PaginatedResult<Category>> {
    return this.findManyPaginated(
      {
        contestId,
        contest: {
          event: {
            archived: false
          }
        }
      },
      { ...options, orderBy: options.orderBy || { createdAt: 'asc' } }
    );
  }

  /**
   * Search categories with pagination
   */
  async searchCategoriesPaginated(query: string, options: PaginationOptions): Promise<PaginatedResult<Category>> {
    return this.findManyPaginated({
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    }, options);
  }
}
