import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { mockDeep, mockReset, type DeepMockProxy } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'
import { BoardService } from '../../../src/services/BoardService'

describe('BoardService.getCertifications auditor mapping', () => {
  let service: BoardService
  let prismaMock: DeepMockProxy<PrismaClient>

  beforeEach(() => {
    prismaMock = mockDeep<PrismaClient>()
    service = new BoardService(prismaMock as unknown as PrismaClient)
  })

  afterEach(() => {
    mockReset(prismaMock)
  })

  it('returns resolved auditor names when multiple auditors have signed', async () => {
    prismaMock.certification.findMany.mockResolvedValue([
      {
        id: 'cert_1',
        categoryId: 'category_1',
        contestId: 'contest_1',
        eventId: 'event_1',
        userId: null,
        status: 'IN_PROGRESS',
        currentStep: 3,
        totalSteps: 4,
        judgeCertified: true,
        tallyCertified: true,
        auditorCertified: true,
        boardApproved: false,
        certifiedAt: new Date('2026-02-21T01:00:00.000Z'),
        certifiedBy: 'auditor_1',
        rejectionReason: null,
        comments: null,
        createdAt: new Date('2026-02-21T00:30:00.000Z'),
        updatedAt: new Date('2026-02-21T01:05:00.000Z'),
        tenantId: 'tenant_1'
      }
    ] as any)

    prismaMock.categoryCertification.findMany.mockResolvedValue([
      {
        categoryId: 'category_1',
        userId: 'auditor_1',
        certifiedAt: new Date('2026-02-21T00:45:00.000Z')
      },
      {
        categoryId: 'category_1',
        userId: 'auditor_2',
        certifiedAt: new Date('2026-02-21T00:50:00.000Z')
      }
    ] as any)

    prismaMock.user.findMany.mockResolvedValue([
      { id: 'auditor_1', name: 'Auditor One', email: 'a1@example.com' },
      { id: 'auditor_2', name: 'Auditor Two', email: 'a2@example.com' }
    ] as any)

    prismaMock.category.findMany.mockResolvedValue([
      { id: 'category_1', name: 'Public Image' }
    ] as any)

    prismaMock.contest.findMany.mockResolvedValue([
      {
        id: 'contest_1',
        name: 'Mr',
        event: { id: 'event_1', name: 'Yearly Event' }
      }
    ] as any)

    const result = await service.getCertifications('tenant_1')

    expect(result).toHaveLength(1)
    expect(result[0]?.auditorId).toBe('auditor_1')
    expect(result[0]?.auditorIds).toEqual(['auditor_1', 'auditor_2'])
    expect(result[0]?.auditorSignedCount).toBe(2)
    expect(result[0]?.auditorName).toBe('Auditor One, Auditor Two')
  })

  it('falls back to certification signer when role-signature rows are missing', async () => {
    prismaMock.certification.findMany.mockResolvedValue([
      {
        id: 'cert_2',
        categoryId: 'category_2',
        contestId: 'contest_2',
        eventId: 'event_2',
        userId: null,
        status: 'IN_PROGRESS',
        currentStep: 3,
        totalSteps: 4,
        judgeCertified: true,
        tallyCertified: true,
        auditorCertified: true,
        boardApproved: false,
        certifiedAt: new Date('2026-02-21T03:00:00.000Z'),
        certifiedBy: 'auditor_3',
        rejectionReason: null,
        comments: null,
        createdAt: new Date('2026-02-21T02:30:00.000Z'),
        updatedAt: new Date('2026-02-21T03:05:00.000Z'),
        tenantId: 'tenant_1'
      }
    ] as any)

    prismaMock.categoryCertification.findMany.mockResolvedValue([] as any)

    prismaMock.user.findMany.mockResolvedValue([
      { id: 'auditor_3', name: 'Fallback Auditor', email: 'a3@example.com' }
    ] as any)

    prismaMock.category.findMany.mockResolvedValue([
      { id: 'category_2', name: 'Interview' }
    ] as any)

    prismaMock.contest.findMany.mockResolvedValue([
      {
        id: 'contest_2',
        name: 'Ms',
        event: { id: 'event_2', name: 'Yearly Event' }
      }
    ] as any)

    const result = await service.getCertifications('tenant_1')

    expect(result).toHaveLength(1)
    expect(result[0]?.auditorId).toBe('auditor_3')
    expect(result[0]?.auditorIds).toEqual(['auditor_3'])
    expect(result[0]?.auditorSignedCount).toBe(1)
    expect(result[0]?.auditorName).toBe('Fallback Auditor')
  })
})
