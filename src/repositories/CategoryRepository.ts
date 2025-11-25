/**
 * Category Repository
 * Data access layer for Category entity
 */

import { Category, Prisma } from '@prisma/client';
import { injectable } from 'tsyringe';
import { BaseRepository, PaginationOptions, PaginatedResult } from './BaseRepository';

type CategoryWithDetails = Prisma.CategoryGetPayload<{
  include: {
    contest: { include: { event: true } };
    criteria: true;
    categoryJudges: { include: { judge: { include: { users: true } } } };
    categoryContestants: { include: { contestant: { include: { users: true } } } };
  };
}>;

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
  async findCategoryWithDetails(categoryId: string): Promise<CategoryWithDetails | null> {
    return this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        contest: {
          include: {
            event: true,
          },
        },
        criteria: true,
        categoryJudges: {
          include: {
            judge: {
              include: {
                users: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    preferredName: true,
                  },
                },
              },
            },
          },
        },
        categoryContestants: {
          include: {
            contestant: {
              include: {
                users: {
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
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: {
            categoryContestants: true,
            categoryJudges: true,
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
      totalContestants: category._count?.categoryContestants ?? 0,
      totalJudges: category._count?.categoryJudges ?? 0,
      totalCriteria: category._count?.criteria ?? 0,
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
