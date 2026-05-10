import { inject, injectable } from 'tsyringe';
import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { BaseService } from './BaseService';
import { CSVParseError, CSVService } from './CSVService';

type JudgeScheduleEntryWithRelations = Prisma.JudgeScheduleEntryGetPayload<{
  include: {
    judge: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
    event: {
      select: {
        id: true;
        name: true;
      };
    };
    contest: {
      select: {
        id: true;
        name: true;
      };
    };
    category: {
      select: {
        id: true;
        name: true;
      };
    };
  };
}>;

type RawScheduleRow = Record<string, string | number | boolean | null | undefined>;

interface ParsedScheduleRow {
  judgeId: string;
  title: string;
  startAt: Date;
  endAt: Date | null;
  eventId: string | null;
  contestId: string | null;
  categoryId: string | null;
  location: string | null;
  notes: string | null;
  sourceRowNumber: number;
}

export interface JudgeScheduleImportResult {
  importBatchId: string;
  total: number;
  successful: number;
  failed: number;
  errors: CSVParseError[];
}

export interface JudgeScheduleListFilters {
  judgeId?: string;
  eventId?: string;
  includePast?: boolean;
}

@injectable()
export class JudgeScheduleService extends BaseService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    private csvService: CSVService,
  ) {
    super();
  }

  private normalizeString(value: unknown): string {
    return String(value || '').trim();
  }

  private parseDateTime(rawValue: string): Date | null {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      return null;
    }

    const normalized = trimmed.includes(' ')
      ? trimmed.replace(' ', 'T')
      : trimmed;
    const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)
      ? `${normalized}:00`
      : normalized;
    const parsed = new Date(withSeconds);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private async resolveEventId(
    tenantId: string,
    eventName: string,
    rowNumber: number,
    errors: CSVParseError[],
  ): Promise<string | null> {
    if (!eventName) {
      return null;
    }

    const matches = await this.prisma.event.findMany({
      where: {
        tenantId,
        deletedAt: null,
        name: { equals: eventName, mode: 'insensitive' },
      },
      select: { id: true, name: true },
      take: 2,
    });

    if (matches.length === 0) {
      errors.push({ row: rowNumber, field: 'eventName', error: 'Event not found', value: eventName });
      return null;
    }

    if (matches.length > 1) {
      errors.push({ row: rowNumber, field: 'eventName', error: 'Event name is ambiguous within this tenant', value: eventName });
      return null;
    }

    return matches[0]!.id;
  }

  private async resolveContest(
    tenantId: string,
    contestName: string,
    eventId: string | null,
    rowNumber: number,
    errors: CSVParseError[],
  ): Promise<{ id: string; eventId: string } | null> {
    if (!contestName) {
      return null;
    }

    const matches = await this.prisma.contest.findMany({
      where: {
        tenantId,
        deletedAt: null,
        name: { equals: contestName, mode: 'insensitive' },
        ...(eventId ? { eventId } : {}),
      },
      select: { id: true, eventId: true, name: true },
      take: eventId ? 1 : 2,
    });

    if (matches.length === 0) {
      errors.push({
        row: rowNumber,
        field: 'contestName',
        error: eventId ? 'Contest not found in the specified event' : 'Contest not found',
        value: contestName,
      });
      return null;
    }

    if (!eventId && matches.length > 1) {
      errors.push({
        row: rowNumber,
        field: 'contestName',
        error: 'Contest name is ambiguous. Provide eventName as well.',
        value: contestName,
      });
      return null;
    }

    return matches[0]!;
  }

  private async resolveCategory(
    tenantId: string,
    categoryName: string,
    contestId: string | null,
    rowNumber: number,
    errors: CSVParseError[],
  ): Promise<{ id: string; contestId: string } | null> {
    if (!categoryName) {
      return null;
    }

    if (!contestId) {
      errors.push({
        row: rowNumber,
        field: 'categoryName',
        error: 'contestName is required when categoryName is provided',
        value: categoryName,
      });
      return null;
    }

    const matches = await this.prisma.category.findMany({
      where: {
        tenantId,
        deletedAt: null,
        contestId,
        name: { equals: categoryName, mode: 'insensitive' },
      },
      select: { id: true, contestId: true, name: true },
      take: 2,
    });

    if (matches.length === 0) {
      errors.push({
        row: rowNumber,
        field: 'categoryName',
        error: 'Category not found in the specified contest',
        value: categoryName,
      });
      return null;
    }

    if (matches.length > 1) {
      errors.push({
        row: rowNumber,
        field: 'categoryName',
        error: 'Category name is ambiguous in the specified contest',
        value: categoryName,
      });
      return null;
    }

    return matches[0]!;
  }

  async importFromCsvBuffer(
    fileBuffer: Buffer,
    tenantId: string,
    uploadedById?: string,
  ): Promise<JudgeScheduleImportResult> {
    const rows = this.csvService.parseCSV(fileBuffer) as RawScheduleRow[];
    const errors: CSVParseError[] = [];
    const parsedRows: ParsedScheduleRow[] = [];
    const importBatchId = randomUUID();

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2;
      const judgeEmail = this.normalizeString(row['judgeEmail']);
      const title = this.normalizeString(row['title']);
      const startAtRaw = this.normalizeString(row['startAt']);
      const endAtRaw = this.normalizeString(row['endAt']);
      const eventName = this.normalizeString(row['eventName']);
      const contestName = this.normalizeString(row['contestName']);
      const categoryName = this.normalizeString(row['categoryName']);
      const location = this.normalizeString(row['location']) || null;
      const notes = this.normalizeString(row['notes']) || null;

      let hasError = false;

      if (!judgeEmail) {
        errors.push({ row: rowNumber, field: 'judgeEmail', error: 'judgeEmail is required' });
        hasError = true;
      }
      if (!title) {
        errors.push({ row: rowNumber, field: 'title', error: 'title is required' });
        hasError = true;
      }
      if (!startAtRaw) {
        errors.push({ row: rowNumber, field: 'startAt', error: 'startAt is required' });
        hasError = true;
      }

      const startAt = this.parseDateTime(startAtRaw);
      if (startAtRaw && !startAt) {
        errors.push({
          row: rowNumber,
          field: 'startAt',
          error: 'startAt must be a valid date/time (ISO 8601 or YYYY-MM-DD HH:mm)',
          value: startAtRaw,
        });
        hasError = true;
      }

      const endAt = endAtRaw ? this.parseDateTime(endAtRaw) : null;
      if (endAtRaw && !endAt) {
        errors.push({
          row: rowNumber,
          field: 'endAt',
          error: 'endAt must be a valid date/time (ISO 8601 or YYYY-MM-DD HH:mm)',
          value: endAtRaw,
        });
        hasError = true;
      }

      if (startAt && endAt && endAt < startAt) {
        errors.push({
          row: rowNumber,
          field: 'endAt',
          error: 'endAt must be the same as or after startAt',
          value: endAtRaw,
        });
        hasError = true;
      }

      if (hasError) {
        continue;
      }

      const judgeMatches = await this.prisma.judge.findMany({
        where: {
          tenantId,
          email: { equals: judgeEmail, mode: 'insensitive' },
        },
        select: { id: true, email: true },
        take: 2,
      });

      if (judgeMatches.length === 0) {
        errors.push({ row: rowNumber, field: 'judgeEmail', error: 'Judge not found', value: judgeEmail });
        continue;
      }

      if (judgeMatches.length > 1) {
        errors.push({ row: rowNumber, field: 'judgeEmail', error: 'Judge email is ambiguous within this tenant', value: judgeEmail });
        continue;
      }

      const resolvedEventId = await this.resolveEventId(tenantId, eventName, rowNumber, errors);
      const contest = await this.resolveContest(tenantId, contestName, resolvedEventId, rowNumber, errors);
      const category = await this.resolveCategory(tenantId, categoryName, contest?.id || null, rowNumber, errors);

      const hadResolutionError = errors.some((error) => error.row === rowNumber);
      if (hadResolutionError) {
        continue;
      }

      parsedRows.push({
        judgeId: judgeMatches[0]!.id,
        title,
        startAt: startAt!,
        endAt,
        eventId: resolvedEventId || contest?.eventId || null,
        contestId: contest?.id || category?.contestId || null,
        categoryId: category?.id || null,
        location,
        notes,
        sourceRowNumber: rowNumber,
      });
    }

    if (parsedRows.length > 0) {
      await this.prisma.judgeScheduleEntry.createMany({
        data: parsedRows.map((row) => ({
          tenantId,
          judgeId: row.judgeId,
          eventId: row.eventId,
          contestId: row.contestId,
          categoryId: row.categoryId,
          title: row.title,
          startAt: row.startAt,
          endAt: row.endAt,
          location: row.location,
          notes: row.notes,
          importBatchId,
          sourceRowNumber: row.sourceRowNumber,
          uploadedById: uploadedById || null,
        })),
      });
    }

    return {
      importBatchId,
      total: rows.length,
      successful: parsedRows.length,
      failed: rows.length - parsedRows.length,
      errors,
    };
  }

  async listSchedules(
    tenantId: string,
    filters: JudgeScheduleListFilters = {},
  ): Promise<JudgeScheduleEntryWithRelations[]> {
    const now = new Date();
    return await this.prisma.judgeScheduleEntry.findMany({
      where: {
        tenantId,
        ...(filters.judgeId ? { judgeId: filters.judgeId } : {}),
        ...(filters.eventId ? { eventId: filters.eventId } : {}),
        ...(filters.includePast
          ? {}
          : {
              OR: [
                { endAt: { gte: now } },
                { endAt: null, startAt: { gte: now } },
              ],
            }),
      },
      include: {
        judge: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
          },
        },
        contest: {
          select: {
            id: true,
            name: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ startAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  getTemplateCsv(): string {
    return this.csvService.exportToCSV(
      [
        {
          judgeEmail: 'judge@example.com',
          title: 'Formal Wear',
          startAt: '2026-05-20 09:00',
          endAt: '2026-05-20 10:00',
          eventName: 'Spring Showcase',
          contestName: 'Miss Teen',
          categoryName: 'Formal Wear',
          location: 'Main Ballroom',
          notes: 'Arrive 15 minutes early',
        },
      ],
      ['judgeEmail', 'title', 'startAt', 'endAt', 'eventName', 'contestName', 'categoryName', 'location', 'notes'],
    );
  }
}
