import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { CSVService } from '../../../src/services/CSVService';
import { JudgeScheduleService } from '../../../src/services/JudgeScheduleService';

describe('JudgeScheduleService', () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let csvService: CSVService;
  let service: JudgeScheduleService;

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    csvService = new CSVService();
    service = new JudgeScheduleService(prisma as any, csvService);
  });

  afterEach(() => {
    mockReset(prisma);
  });

  it('imports valid schedule rows and links resolved entities', async () => {
    const csvBuffer = Buffer.from(
      'judgeEmail,title,startAt,endAt,eventName,contestName,categoryName,location,notes\n' +
      'judge@example.com,Formal Wear,2026-05-20 09:00,2026-05-20 10:00,Spring Showcase,Miss Teen,Formal Wear,Main Ballroom,Arrive early\n',
      'utf-8',
    );

    prisma.judge.findMany.mockResolvedValue([{ id: 'judge-1', email: 'judge@example.com' }] as any);
    prisma.event.findMany.mockResolvedValue([{ id: 'event-1', name: 'Spring Showcase' }] as any);
    prisma.contest.findMany.mockResolvedValue([{ id: 'contest-1', eventId: 'event-1', name: 'Miss Teen' }] as any);
    prisma.category.findMany.mockResolvedValue([{ id: 'category-1', contestId: 'contest-1', name: 'Formal Wear' }] as any);
    prisma.judgeScheduleEntry.createMany.mockResolvedValue({ count: 1 } as any);

    const result = await service.importFromCsvBuffer(csvBuffer, 'tenant-1', 'admin-1');

    expect(result.total).toBe(1);
    expect(result.successful).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([]);
    expect(prisma.judgeScheduleEntry.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          tenantId: 'tenant-1',
          judgeId: 'judge-1',
          eventId: 'event-1',
          contestId: 'contest-1',
          categoryId: 'category-1',
          title: 'Formal Wear',
          location: 'Main Ballroom',
          notes: 'Arrive early',
          uploadedById: 'admin-1',
          sourceRowNumber: 2,
        }),
      ],
    });
  });

  it('returns clear validation errors for malformed schedule rows', async () => {
    const csvBuffer = Buffer.from(
      'judgeEmail,title,startAt,endAt,eventName,contestName,categoryName\n' +
      ',,not-a-date,,,,Formal Wear\n',
      'utf-8',
    );

    const result = await service.importFromCsvBuffer(csvBuffer, 'tenant-1', 'admin-1');

    expect(result.total).toBe(1);
    expect(result.successful).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ row: 2, field: 'judgeEmail' }),
        expect.objectContaining({ row: 2, field: 'title' }),
        expect.objectContaining({ row: 2, field: 'startAt' }),
      ]),
    );
    expect(prisma.judgeScheduleEntry.createMany).not.toHaveBeenCalled();
  });

  it('requires contestName when categoryName is provided', async () => {
    const csvBuffer = Buffer.from(
      'judgeEmail,title,startAt,endAt,eventName,contestName,categoryName\n' +
      'judge@example.com,Orientation,2026-05-20 09:00,,,,Formal Wear\n',
      'utf-8',
    );

    prisma.judge.findMany.mockResolvedValue([{ id: 'judge-1', email: 'judge@example.com' }] as any);
    prisma.contest.findMany.mockResolvedValue([] as any);

    const result = await service.importFromCsvBuffer(csvBuffer, 'tenant-1', 'admin-1');

    expect(result.successful).toBe(0);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          row: 2,
          field: 'categoryName',
          error: 'contestName is required when categoryName is provided',
        }),
      ]),
    );
  });

  it('reports ambiguous contests when eventName is omitted', async () => {
    const csvBuffer = Buffer.from(
      'judgeEmail,title,startAt,endAt,eventName,contestName,categoryName\n' +
      'judge@example.com,Interview,2026-05-20 11:00,, ,Miss Teen,\n',
      'utf-8',
    );

    prisma.judge.findMany.mockResolvedValue([{ id: 'judge-1', email: 'judge@example.com' }] as any);
    prisma.contest.findMany.mockResolvedValue([
      { id: 'contest-1', eventId: 'event-1', name: 'Miss Teen' },
      { id: 'contest-2', eventId: 'event-2', name: 'Miss Teen' },
    ] as any);

    const result = await service.importFromCsvBuffer(csvBuffer, 'tenant-1', 'admin-1');

    expect(result.successful).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          row: 2,
          field: 'contestName',
          error: 'Contest name is ambiguous. Provide eventName as well.',
          value: 'Miss Teen',
        }),
      ]),
    );
    expect(prisma.judgeScheduleEntry.createMany).not.toHaveBeenCalled();
  });

  it('rejects rows where endAt is earlier than startAt', async () => {
    const csvBuffer = Buffer.from(
      'judgeEmail,title,startAt,endAt,eventName,contestName,categoryName\n' +
      'judge@example.com,Interview,2026-05-20 11:00,2026-05-20 10:00,,Miss Teen,\n',
      'utf-8',
    );

    const result = await service.importFromCsvBuffer(csvBuffer, 'tenant-1', 'admin-1');

    expect(result.successful).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          row: 2,
          field: 'endAt',
          error: 'endAt must be the same as or after startAt',
        }),
      ]),
    );
    expect(prisma.judgeScheduleEntry.createMany).not.toHaveBeenCalled();
  });

  it('filters upcoming schedules without excluding future rows that have no endAt', async () => {
    prisma.judgeScheduleEntry.findMany.mockResolvedValue([] as any);

    await service.listSchedules('tenant-1', { judgeId: 'judge-1', includePast: false });

    expect(prisma.judgeScheduleEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          judgeId: 'judge-1',
          OR: [
            { endAt: { gte: expect.any(Date) } },
            { endAt: null, startAt: { gte: expect.any(Date) } },
          ],
        }),
      }),
    );
  });

  it('includes all matching rows when includePast is true', async () => {
    prisma.judgeScheduleEntry.findMany.mockResolvedValue([] as any);

    await service.listSchedules('tenant-1', { eventId: 'event-1', includePast: true });

    expect(prisma.judgeScheduleEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-1',
          eventId: 'event-1',
        },
      }),
    );
  });

  it('returns a CSV template with the documented header row', () => {
    const template = service.getTemplateCsv();

    expect(template).toContain(
      'judgeEmail,title,startAt,endAt,eventName,contestName,categoryName,location,notes',
    );
    expect(template).toContain('judge@example.com');
  });
});
