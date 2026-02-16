import { inject, injectable } from 'tsyringe'
import { Prisma, PrismaClient, RequestStatus, UserRole } from '@prisma/client'
import { randomUUID } from 'crypto'
import { BaseService } from './BaseService'
import { refreshJudgeStage } from '../utils/certificationPipeline'

const SETTINGS_KEYS = {
  REQUIRED_ADDITIONAL_APPROVALS: 'score_governance_required_additional_approvals',
  APPROVER_ROLES: 'score_governance_approver_roles'
}

const DEFAULT_REQUIRED_ADDITIONAL_APPROVALS = 2
const DEFAULT_APPROVER_ROLES: UserRole[] = ['AUDITOR', 'BOARD', 'ORGANIZER', 'ADMIN', 'SUPER_ADMIN']

type GovernanceAction = 'THROW_OUT' | 'UNCERTIFY'
type GovernanceScope = 'CATEGORY_JUDGE' | 'CONTEST_JUDGE' | 'SCORE' | 'CONTESTANT_CATEGORY' | 'CATEGORY_LEVEL'
type CertificationLevel = 'JUDGE' | 'TALLY_MASTER' | 'AUDITOR' | 'BOARD'

interface SignaturePayload {
  typedSignature?: string
  drawnSignatureData?: string
  signatureFilePath?: string
}

interface GovernanceSettings {
  requiredAdditionalApprovals: number
  approverRoles: UserRole[]
}

interface CreateGovernanceRequestInput {
  tenantId: string
  userId: string
  userRole: UserRole
  actionType: GovernanceAction
  scopeType: GovernanceScope
  targetCertificationLevel?: CertificationLevel
  eventId?: string
  contestId?: string
  categoryId?: string
  contestantId?: string
  judgeId?: string
  scoreId?: string
  reason: string
  signature: SignaturePayload
}

interface GovernanceFilter {
  contestId?: string
  categoryId?: string
  contestantId?: string
  status?: RequestStatus
  actionType?: GovernanceAction
}

@injectable()
export class ScoreGovernanceService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super()
  }

  private async getTenantSetting(key: string, tenantId: string): Promise<string | null> {
    const tenantSetting = await this.prisma.systemSetting.findFirst({ where: { key, tenantId } })
    if (tenantSetting) return tenantSetting.value
    const globalSetting = await this.prisma.systemSetting.findFirst({ where: { key, tenantId: null } })
    return globalSetting?.value || null
  }

  async getSettings(tenantId: string): Promise<GovernanceSettings> {
    const [requiredRaw, rolesRaw] = await Promise.all([
      this.getTenantSetting(SETTINGS_KEYS.REQUIRED_ADDITIONAL_APPROVALS, tenantId),
      this.getTenantSetting(SETTINGS_KEYS.APPROVER_ROLES, tenantId)
    ])

    let requiredAdditionalApprovals = DEFAULT_REQUIRED_ADDITIONAL_APPROVALS
    const parsedRequired = Number(requiredRaw)
    if (Number.isFinite(parsedRequired) && parsedRequired >= 1 && parsedRequired <= 10) {
      requiredAdditionalApprovals = parsedRequired
    }

    let approverRoles = DEFAULT_APPROVER_ROLES
    if (rolesRaw) {
      try {
        const parsed = JSON.parse(rolesRaw)
        if (Array.isArray(parsed)) {
          approverRoles = parsed.filter((r) => Object.values(UserRole).includes(r as UserRole)) as UserRole[]
        }
      } catch {
        approverRoles = DEFAULT_APPROVER_ROLES
      }
    }

    if (approverRoles.length === 0) approverRoles = DEFAULT_APPROVER_ROLES

    return { requiredAdditionalApprovals, approverRoles }
  }

  async updateSettings(tenantId: string, userId: string, settings: GovernanceSettings): Promise<GovernanceSettings> {
    const requiredAdditionalApprovals = Math.max(1, Math.min(10, Number(settings.requiredAdditionalApprovals || DEFAULT_REQUIRED_ADDITIONAL_APPROVALS)))
    const approverRoles = (settings.approverRoles || []).filter((r) => Object.values(UserRole).includes(r))

    if (approverRoles.length === 0) throw this.badRequestError('At least one approver role is required')

    await this.prisma.$transaction(async (tx) => {
      await tx.systemSetting.upsert({
        where: { key_tenantId: { key: SETTINGS_KEYS.REQUIRED_ADDITIONAL_APPROVALS, tenantId } },
        create: {
          key: SETTINGS_KEYS.REQUIRED_ADDITIONAL_APPROVALS,
          value: String(requiredAdditionalApprovals),
          category: 'scoring',
          description: 'Additional approvals required for score governance requests',
          tenantId,
          updatedBy: userId
        },
        update: { value: String(requiredAdditionalApprovals), updatedBy: userId }
      })

      await tx.systemSetting.upsert({
        where: { key_tenantId: { key: SETTINGS_KEYS.APPROVER_ROLES, tenantId } },
        create: {
          key: SETTINGS_KEYS.APPROVER_ROLES,
          value: JSON.stringify(approverRoles),
          category: 'scoring',
          description: 'Roles allowed to co-approve score governance requests',
          tenantId,
          updatedBy: userId
        },
        update: { value: JSON.stringify(approverRoles), updatedBy: userId }
      })
    })

    return { requiredAdditionalApprovals, approverRoles }
  }

  private validateSignature(signature: SignaturePayload): void {
    if (!signature.typedSignature?.trim() && !signature.drawnSignatureData?.trim() && !signature.signatureFilePath?.trim()) {
      throw this.badRequestError('A typed, drawn, or file signature is required')
    }
  }

  private validateRequestRules(input: CreateGovernanceRequestInput): void {
    if (!input.reason?.trim()) throw this.badRequestError('Reason is required')

    if (input.actionType === 'THROW_OUT') {
      if (!['CATEGORY_JUDGE', 'CONTEST_JUDGE'].includes(input.scopeType)) {
        throw this.badRequestError('Throw-out supports CATEGORY_JUDGE or CONTEST_JUDGE scopes only')
      }
      if (!input.judgeId) throw this.badRequestError('judgeId is required for throw-out')
      if (input.scopeType === 'CATEGORY_JUDGE' && !input.categoryId) throw this.badRequestError('categoryId is required for CATEGORY_JUDGE throw-out')
      if (input.scopeType === 'CONTEST_JUDGE' && !input.contestId) throw this.badRequestError('contestId is required for CONTEST_JUDGE throw-out')
    }

    if (input.actionType === 'UNCERTIFY') {
      if (!['SCORE', 'CONTESTANT_CATEGORY', 'CATEGORY_LEVEL'].includes(input.scopeType)) {
        throw this.badRequestError('Uncertify supports SCORE, CONTESTANT_CATEGORY, or CATEGORY_LEVEL scope')
      }
      if (input.scopeType === 'SCORE' && !input.scoreId) throw this.badRequestError('scoreId is required for SCORE uncertification')
      if (input.scopeType === 'CONTESTANT_CATEGORY' && (!input.contestantId || !input.categoryId)) {
        throw this.badRequestError('contestantId and categoryId are required for CONTESTANT_CATEGORY uncertification')
      }
      if (input.scopeType === 'CATEGORY_LEVEL') {
        if (!input.categoryId) throw this.badRequestError('categoryId is required for CATEGORY_LEVEL uncertification')
        if (!input.targetCertificationLevel || !['JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD'].includes(input.targetCertificationLevel)) {
          throw this.badRequestError('targetCertificationLevel must be JUDGE, TALLY_MASTER, AUDITOR, or BOARD')
        }
      }
    }
  }

  private async inferThrowOutDefaults(input: CreateGovernanceRequestInput): Promise<CreateGovernanceRequestInput> {
    if (input.actionType !== 'THROW_OUT') return input

    const out = { ...input }

    if (out.scopeType === 'CATEGORY_JUDGE' && !out.categoryId && out.contestId) {
      const firstCategory = await this.prisma.category.findFirst({
        where: { tenantId: out.tenantId, contestId: out.contestId, deletedAt: null },
        select: { id: true },
        orderBy: { createdAt: 'asc' }
      })
      out.categoryId = firstCategory?.id || out.categoryId
    }

    if (out.scopeType === 'CONTEST_JUDGE' && !out.contestId && out.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: out.categoryId, tenantId: out.tenantId },
        select: { contestId: true }
      })
      out.contestId = category?.contestId || out.contestId
    }

    if (!out.judgeId) {
      const score = await this.prisma.score.findFirst({
        where: {
          tenantId: out.tenantId,
          ...(out.categoryId ? { categoryId: out.categoryId } : {}),
          ...(out.contestId ? { category: { contestId: out.contestId } } : {})
        },
        select: { judgeId: true },
        orderBy: { updatedAt: 'desc' }
      })
      out.judgeId = score?.judgeId || out.judgeId
    }

    if (out.judgeId && out.scopeType === 'CONTEST_JUDGE' && !out.contestId) {
      const score = await this.prisma.score.findFirst({
        where: { tenantId: out.tenantId, judgeId: out.judgeId },
        select: { category: { select: { contestId: true } } },
        orderBy: { updatedAt: 'desc' }
      })
      out.contestId = score?.category?.contestId || out.contestId
    }

    if (out.judgeId && out.scopeType === 'CATEGORY_JUDGE' && !out.categoryId) {
      const score = await this.prisma.score.findFirst({
        where: { tenantId: out.tenantId, judgeId: out.judgeId },
        select: { categoryId: true },
        orderBy: { updatedAt: 'desc' }
      })
      out.categoryId = score?.categoryId || out.categoryId
    }

    return out
  }

  private async enrichScope(input: CreateGovernanceRequestInput): Promise<CreateGovernanceRequestInput> {
    const out = { ...input }
    if (out.scoreId) {
      const score = await this.prisma.score.findFirst({
        where: { id: out.scoreId, tenantId: out.tenantId },
        select: {
          id: true,
          categoryId: true,
          contestantId: true,
          judgeId: true,
          category: { select: { contestId: true, contest: { select: { eventId: true } } } }
        }
      })
      if (!score) throw this.notFoundError('Score', out.scoreId)
      out.categoryId = out.categoryId || score.categoryId
      out.contestantId = out.contestantId || score.contestantId
      out.judgeId = out.judgeId || score.judgeId
      out.contestId = out.contestId || score.category?.contestId
      out.eventId = out.eventId || score.category?.contest?.eventId
    }

    if (out.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: out.categoryId, tenantId: out.tenantId },
        select: { id: true, contestId: true, contest: { select: { eventId: true } } }
      })
      if (!category) throw this.notFoundError('Category', out.categoryId)
      out.contestId = out.contestId || category.contestId
      out.eventId = out.eventId || category.contest?.eventId
    }

    if (out.contestId) {
      const contest = await this.prisma.contest.findFirst({ where: { id: out.contestId, tenantId: out.tenantId }, select: { id: true, eventId: true } })
      if (!contest) throw this.notFoundError('Contest', out.contestId)
      out.eventId = out.eventId || contest.eventId
    }

    if (out.contestantId) {
      const contestant = await this.prisma.contestant.findFirst({ where: { id: out.contestantId, tenantId: out.tenantId }, select: { id: true } })
      if (!contestant) throw this.notFoundError('Contestant', out.contestantId)
    }

    if (out.judgeId) {
      const judge = await this.prisma.judge.findFirst({ where: { id: out.judgeId, tenantId: out.tenantId }, select: { id: true } })
      if (!judge) throw this.notFoundError('Judge', out.judgeId)
    }

    return out
  }

  async createRequest(input: CreateGovernanceRequestInput) {
    this.validateSignature(input.signature)

    if (input.actionType === 'THROW_OUT' && input.userRole === 'JUDGE') {
      throw this.forbiddenError('Judges cannot create throw-out requests')
    }

    let normalized = await this.enrichScope(input)
    normalized = await this.inferThrowOutDefaults(normalized)
    this.validateRequestRules(normalized)

    if (normalized.actionType === 'UNCERTIFY' && normalized.scopeType === 'CATEGORY_LEVEL') {
      const levelRank: Record<UserRole, number> = {
        CONTESTANT: 0,
        EMCEE: 0,
        JUDGE: 1,
        TALLY_MASTER: 2,
        AUDITOR: 3,
        BOARD: 4,
        ORGANIZER: 5,
        ADMIN: 6,
        SUPER_ADMIN: 7
      }
      const targetRank: Record<CertificationLevel, number> = {
        JUDGE: 1,
        TALLY_MASTER: 2,
        AUDITOR: 3,
        BOARD: 4
      }
      const requesterRank = levelRank[normalized.userRole] || 0
      const requestedRank = normalized.targetCertificationLevel ? targetRank[normalized.targetCertificationLevel] : 0
      if (requestedRank > requesterRank) {
        throw this.forbiddenError('You can only request uncertification at your level or lower')
      }
    }

    if (normalized.userRole === 'JUDGE') {
      if (normalized.actionType !== 'UNCERTIFY') throw this.forbiddenError('Judges can only create uncertification requests')
      if (!['SCORE', 'CONTESTANT_CATEGORY'].includes(normalized.scopeType)) {
        throw this.forbiddenError('Judges may only request uncertification for their own score rows')
      }
      const user = await this.prisma.user.findFirst({ where: { id: normalized.userId, tenantId: normalized.tenantId }, select: { judgeId: true } })
      if (!user?.judgeId) throw this.forbiddenError('Judge account linkage is required')
      const ownJudgeId = user.judgeId

      if (normalized.judgeId && normalized.judgeId !== ownJudgeId) {
        throw this.forbiddenError('Judges may only request uncertification for their own scores')
      }
      normalized.judgeId = ownJudgeId

      if (normalized.scoreId) {
        const score = await this.prisma.score.findFirst({ where: { id: normalized.scoreId, tenantId: normalized.tenantId }, select: { judgeId: true } })
        if (!score || score.judgeId !== ownJudgeId) {
          throw this.forbiddenError('Judges may only request uncertification for their own scores')
        }
      }

      if (normalized.scopeType === 'CONTESTANT_CATEGORY') {
        const hasOwnScores = await this.prisma.score.findFirst({
          where: {
            tenantId: normalized.tenantId,
            judgeId: ownJudgeId,
            contestantId: normalized.contestantId || undefined,
            categoryId: normalized.categoryId || undefined
          },
          select: { id: true }
        })
        if (!hasOwnScores) {
          throw this.forbiddenError('Judges may only request uncertification for contestant/category scores they own')
        }
      }
    }

    const settings = await this.getSettings(normalized.tenantId)
    const requestId = randomUUID()
    const approvalId = randomUUID()

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "score_governance_requests" (
          "id","actionType","scopeType","targetCertificationLevel","eventId","contestId","categoryId","contestantId","judgeId","scoreId",
          "reason","status","requestedById","requesterRole","initiatorTypedSignature","initiatorDrawnSignatureData","initiatorSignatureFilePath",
          "requiredAdditionalApprovals","tenantId","createdAt","updatedAt"
        ) VALUES (
          ${requestId},${normalized.actionType},${normalized.scopeType},${normalized.targetCertificationLevel || null},${normalized.eventId || null},${normalized.contestId || null},
          ${normalized.categoryId || null},${normalized.contestantId || null},${normalized.judgeId || null},${normalized.scoreId || null},
          ${normalized.reason.trim()},'PENDING'::"RequestStatus",${normalized.userId},${normalized.userRole},${normalized.signature.typedSignature || null},
          ${normalized.signature.drawnSignatureData || null},${normalized.signature.signatureFilePath || null},${settings.requiredAdditionalApprovals},${normalized.tenantId},
          NOW(),NOW()
        )
      `

      await tx.$executeRaw`
        INSERT INTO "score_governance_approvals" (
          "id","requestId","approvedById","approverRole","typedSignature","drawnSignatureData","signatureFilePath","tenantId","approvedAt"
        ) VALUES (
          ${approvalId},${requestId},${normalized.userId},${normalized.userRole},${normalized.signature.typedSignature || null},
          ${normalized.signature.drawnSignatureData || null},${normalized.signature.signatureFilePath || null},${normalized.tenantId},NOW()
        )
      `
    })

    return this.getRequestById(requestId, normalized.tenantId)
  }

  private async getRequestById(id: string, tenantId: string) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT r.*, u.name AS "requestedByName", u.email AS "requestedByEmail",
             c.name AS "categoryName", co.name AS "contestName", ct.name AS "contestantName", ct."contestantNumber" AS "contestantNumber", j.name AS "judgeName"
      FROM "score_governance_requests" r
      LEFT JOIN "users" u ON u.id = r."requestedById"
      LEFT JOIN "categories" c ON c.id = r."categoryId"
      LEFT JOIN "contests" co ON co.id = r."contestId"
      LEFT JOIN "contestants" ct ON ct.id = r."contestantId"
      LEFT JOIN "judges" j ON j.id = r."judgeId"
      WHERE r.id = ${id} AND r."tenantId" = ${tenantId}
      LIMIT 1
    `

    if (!rows[0]) throw this.notFoundError('Score governance request', id)

    const approvals = await this.prisma.$queryRaw<any[]>`
      SELECT a.*, u.name AS "approvedByName", u.email AS "approvedByEmail"
      FROM "score_governance_approvals" a
      LEFT JOIN "users" u ON u.id = a."approvedById"
      WHERE a."requestId" = ${id} AND a."tenantId" = ${tenantId}
      ORDER BY a."approvedAt" ASC
    `

    return {
      ...rows[0],
      approvals,
      requestedBy: rows[0].requestedByName ? { id: rows[0].requestedById, name: rows[0].requestedByName, email: rows[0].requestedByEmail, role: rows[0].requesterRole } : null,
      category: rows[0].categoryName ? { id: rows[0].categoryId, name: rows[0].categoryName } : null,
      contest: rows[0].contestName ? { id: rows[0].contestId, name: rows[0].contestName } : null,
      contestant: rows[0].contestantName ? { id: rows[0].contestantId, name: rows[0].contestantName, contestantNumber: rows[0].contestantNumber } : null,
      judge: rows[0].judgeName ? { id: rows[0].judgeId, name: rows[0].judgeName } : null
    }
  }

  async getRequests(tenantId: string, filters: GovernanceFilter = {}, context?: { userId?: string; userRole?: UserRole }) {
    const conditions: Prisma.Sql[] = [Prisma.sql`r."tenantId" = ${tenantId}`]
    if (filters.contestId) conditions.push(Prisma.sql`r."contestId" = ${filters.contestId}`)
    if (filters.categoryId) conditions.push(Prisma.sql`r."categoryId" = ${filters.categoryId}`)
    if (filters.contestantId) conditions.push(Prisma.sql`r."contestantId" = ${filters.contestantId}`)
    if (filters.status) conditions.push(Prisma.sql`r."status" = ${filters.status}`)
    if (filters.actionType) conditions.push(Prisma.sql`r."actionType" = ${filters.actionType}`)
    if (context?.userRole === 'JUDGE') {
      conditions.push(Prisma.sql`r."requestedById" = ${context.userId || ''}`)
    }

    const whereClause = Prisma.join(conditions, ' AND ')

    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT r.*, u.name AS "requestedByName", u.email AS "requestedByEmail",
             c.name AS "categoryName", co.name AS "contestName", ct.name AS "contestantName", ct."contestantNumber" AS "contestantNumber", j.name AS "judgeName"
      FROM "score_governance_requests" r
      LEFT JOIN "users" u ON u.id = r."requestedById"
      LEFT JOIN "categories" c ON c.id = r."categoryId"
      LEFT JOIN "contests" co ON co.id = r."contestId"
      LEFT JOIN "contestants" ct ON ct.id = r."contestantId"
      LEFT JOIN "judges" j ON j.id = r."judgeId"
      WHERE ${whereClause}
      ORDER BY r."createdAt" DESC
    `)

    const requestIds = rows.map((r) => r.id)
    const approvals = requestIds.length > 0
      ? await this.prisma.$queryRaw<any[]>(Prisma.sql`
          SELECT a.*, u.name AS "approvedByName", u.email AS "approvedByEmail"
          FROM "score_governance_approvals" a
          LEFT JOIN "users" u ON u.id = a."approvedById"
          WHERE a."tenantId" = ${tenantId} AND a."requestId" IN (${Prisma.join(requestIds)})
          ORDER BY a."approvedAt" ASC
        `)
      : []

    const approvalsByRequest = new Map<string, any[]>()
    approvals.forEach((a) => {
      const list = approvalsByRequest.get(a.requestId) || []
      list.push(a)
      approvalsByRequest.set(a.requestId, list)
    })

    return rows.map((row) => ({
      ...row,
      approvals: approvalsByRequest.get(row.id) || [],
      requestedBy: row.requestedByName ? { id: row.requestedById, name: row.requestedByName, email: row.requestedByEmail, role: row.requesterRole } : null,
      category: row.categoryName ? { id: row.categoryId, name: row.categoryName } : null,
      contest: row.contestName ? { id: row.contestId, name: row.contestName } : null,
      contestant: row.contestantName ? { id: row.contestantId, name: row.contestantName, contestantNumber: row.contestantNumber } : null,
      judge: row.judgeName ? { id: row.judgeId, name: row.judgeName } : null
    }))
  }

  private async recomputeCertificationState(tx: Prisma.TransactionClient, tenantId: string, categoryId: string): Promise<void> {
    const cert = await tx.certification.findFirst({ where: { tenantId, categoryId } })
    if (!cert) return

    const hasJudge = await tx.judgeCertification.findFirst({ where: { tenantId, categoryId }, select: { judgeId: true } })
    const hasTally = await tx.categoryCertification.findFirst({ where: { tenantId, categoryId, role: 'TALLY_MASTER' }, select: { id: true } })
    const hasAuditor = await tx.categoryCertification.findFirst({ where: { tenantId, categoryId, role: 'AUDITOR' }, select: { id: true } })
    const hasBoard = await tx.categoryCertification.findFirst({ where: { tenantId, categoryId, role: 'BOARD' }, select: { id: true } })

    const judgeCertified = !!hasJudge
    const tallyCertified = !!hasTally
    const auditorCertified = !!hasAuditor
    const boardApproved = !!hasBoard

    const status = boardApproved ? 'CERTIFIED' : (judgeCertified || tallyCertified || auditorCertified) ? 'IN_PROGRESS' : 'PENDING'
    const currentStep = boardApproved ? 4 : auditorCertified ? 4 : tallyCertified ? 3 : judgeCertified ? 2 : 1

    await tx.certification.update({
      where: { id: cert.id },
      data: { judgeCertified, tallyCertified, auditorCertified, boardApproved, status, currentStep }
    })
  }

  private async executeRequest(tx: Prisma.TransactionClient, request: any): Promise<string> {
    if (request.actionType === 'THROW_OUT') {
      const where: Prisma.ScoreWhereInput = {
        tenantId: request.tenantId,
        judgeId: request.judgeId || undefined,
        ...(request.scopeType === 'CATEGORY_JUDGE' ? { categoryId: request.categoryId || undefined } : {}),
        ...(request.scopeType === 'CONTEST_JUDGE' ? { category: { contestId: request.contestId || undefined } } : {})
      }

      const updated = await tx.score.updateMany({
        where,
        data: {
          score: null,
          deduction: 0,
          deductionReason: null,
          isCertified: false,
          certifiedAt: null,
          certifiedBy: null,
          isLocked: false,
          lockedAt: null,
          lockedBy: null,
          updatedAt: new Date()
        }
      })

      if (request.scopeType === 'CATEGORY_JUDGE' && request.categoryId) {
        await tx.judgeCertification.deleteMany({ where: { tenantId: request.tenantId, categoryId: request.categoryId, judgeId: request.judgeId || undefined } })
        await this.recomputeCertificationState(tx, request.tenantId, request.categoryId)
      }

      return `Threw out ${updated.count} score rows`
    }

    if (request.actionType === 'UNCERTIFY') {
      if (request.scopeType === 'SCORE') {
        await tx.score.updateMany({
          where: { id: request.scoreId, tenantId: request.tenantId },
          data: {
            isCertified: false,
            certifiedAt: null,
            certifiedBy: null,
            isLocked: false,
            lockedAt: null,
            lockedBy: null
          }
        })
        return 'Uncertified score row'
      }

      if (request.scopeType === 'CONTESTANT_CATEGORY') {
        const updated = await tx.score.updateMany({
          where: { tenantId: request.tenantId, categoryId: request.categoryId, contestantId: request.contestantId },
          data: {
            isCertified: false,
            certifiedAt: null,
            certifiedBy: null,
            isLocked: false,
            lockedAt: null,
            lockedBy: null
          }
        })

        if (request.categoryId) {
          await tx.judgeCertification.deleteMany({ where: { tenantId: request.tenantId, categoryId: request.categoryId } })
          await this.recomputeCertificationState(tx, request.tenantId, request.categoryId)
        }

        return `Uncertified ${updated.count} score rows`
      }

      if (request.scopeType === 'CATEGORY_LEVEL' && request.categoryId) {
        const level = request.targetCertificationLevel as CertificationLevel | null
        if (!level) throw this.badRequestError('targetCertificationLevel is required for CATEGORY_LEVEL uncertification')

        const levelOrder: CertificationLevel[] = ['JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD']
        const startIndex = levelOrder.indexOf(level)
        const affected = levelOrder.slice(startIndex)

        if (affected.includes('JUDGE')) {
          await tx.judgeCertification.deleteMany({ where: { tenantId: request.tenantId, categoryId: request.categoryId } })
          await tx.score.updateMany({
            where: { tenantId: request.tenantId, categoryId: request.categoryId },
            data: {
              isCertified: false,
              certifiedAt: null,
              certifiedBy: null,
              isLocked: false,
              lockedAt: null,
              lockedBy: null
            }
          })
        }

        if (affected.includes('TALLY_MASTER')) {
          await tx.categoryCertification.deleteMany({ where: { tenantId: request.tenantId, categoryId: request.categoryId, role: 'TALLY_MASTER' } })
        }
        if (affected.includes('AUDITOR')) {
          await tx.categoryCertification.deleteMany({ where: { tenantId: request.tenantId, categoryId: request.categoryId, role: 'AUDITOR' } })
        }
        if (affected.includes('BOARD')) {
          await tx.categoryCertification.deleteMany({ where: { tenantId: request.tenantId, categoryId: request.categoryId, role: 'BOARD' } })
        }

        await this.recomputeCertificationState(tx, request.tenantId, request.categoryId)
        return `Uncertified category level ${level}`
      }
    }

    throw this.badRequestError('Unsupported governance action/scope combination')
  }

  async approveRequest(id: string, tenantId: string, approverId: string, approverRole: UserRole, signature: SignaturePayload) {
    this.validateSignature(signature)

    const settings = await this.getSettings(tenantId)
    if (!settings.approverRoles.includes(approverRole)) {
      throw this.forbiddenError(`Role ${approverRole} is not configured as a governance approver`)
    }

    let categoryIdToRefresh: string | null = null

    await this.prisma.$transaction(async (tx) => {
      const requestRows = await tx.$queryRaw<any[]>`
        SELECT * FROM "score_governance_requests" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
      `
      const request = requestRows[0]
      if (!request) throw this.notFoundError('Score governance request', id)
      if (request.status !== 'PENDING') throw this.badRequestError(`Request already ${String(request.status).toLowerCase()}`)
      if (request.requestedById === approverId) throw this.badRequestError('Initiator is already certified; another approver is required')

      await tx.$executeRaw`
        INSERT INTO "score_governance_approvals" (
          "id","requestId","approvedById","approverRole","typedSignature","drawnSignatureData","signatureFilePath","tenantId","approvedAt"
        ) VALUES (
          ${randomUUID()},${id},${approverId},${approverRole},${signature.typedSignature || null},${signature.drawnSignatureData || null},${signature.signatureFilePath || null},${tenantId},NOW()
        )
        ON CONFLICT ("tenantId","requestId","approvedById") DO UPDATE
        SET "approverRole" = EXCLUDED."approverRole",
            "typedSignature" = EXCLUDED."typedSignature",
            "drawnSignatureData" = EXCLUDED."drawnSignatureData",
            "signatureFilePath" = EXCLUDED."signatureFilePath",
            "approvedAt" = NOW()
      `

      const approvals = await tx.$queryRaw<any[]>`
        SELECT DISTINCT "approvedById" FROM "score_governance_approvals" WHERE "requestId" = ${id} AND "tenantId" = ${tenantId}
      `

      const approverIds = new Set(approvals.map((a) => a.approvedById as string))
      const hasInitiator = approverIds.has(request.requestedById as string)
      const additionalApprovals = Array.from(approverIds).filter((uid) => uid !== request.requestedById).length

      if (hasInitiator && additionalApprovals >= Number(request.requiredAdditionalApprovals || 2)) {
        const executionSummary = await this.executeRequest(tx, request)
        await tx.$executeRaw`
          UPDATE "score_governance_requests"
          SET "status" = 'APPROVED'::"RequestStatus",
              "executedAt" = NOW(),
              "executedById" = ${approverId},
              "executionSummary" = ${executionSummary},
              "updatedAt" = NOW()
          WHERE id = ${id}
        `

        categoryIdToRefresh = (request.categoryId as string) || null
      }
    })

    if (categoryIdToRefresh) {
      await refreshJudgeStage(this.prisma, tenantId, categoryIdToRefresh).catch(() => undefined)
    }

    return this.getRequestById(id, tenantId)
  }

  async rejectRequest(id: string, tenantId: string, rejectedByRole: UserRole, reason: string) {
    if (!reason?.trim()) throw this.badRequestError('Rejection reason is required')

    const settings = await this.getSettings(tenantId)
    if (!settings.approverRoles.includes(rejectedByRole)) {
      throw this.forbiddenError(`Role ${rejectedByRole} is not configured as a governance approver`)
    }

    const rows = await this.prisma.$queryRaw<any[]>`SELECT * FROM "score_governance_requests" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1`
    const request = rows[0]
    if (!request) throw this.notFoundError('Score governance request', id)
    if (request.status !== 'PENDING') throw this.badRequestError(`Request already ${String(request.status).toLowerCase()}`)

    await this.prisma.$executeRaw`
      UPDATE "score_governance_requests"
      SET "status" = 'REJECTED'::"RequestStatus",
          "executionSummary" = ${reason.trim()},
          "updatedAt" = NOW()
      WHERE id = ${id}
    `

    return this.getRequestById(id, tenantId)
  }

  private async buildScopedCategoryFilter(tenantId: string, userId: string, userRole: UserRole): Promise<Prisma.CategoryWhereInput | null> {
    if (['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'].includes(userRole)) {
      return { tenantId, deletedAt: null }
    }

    if (userRole === 'TALLY_MASTER') {
      const assignments = await this.prisma.tallyMasterAssignment.findMany({ where: { tenantId, userId, status: 'ACTIVE' } })
      if (assignments.length === 0) return { id: { in: [] } }
      const categoryIds = assignments.map((a) => a.categoryId).filter((id): id is string => !!id)
      const contestIds = assignments.map((a) => a.contestId).filter((id): id is string => !!id)
      const eventIds = assignments.map((a) => a.eventId).filter((id): id is string => !!id)
      return {
        tenantId,
        deletedAt: null,
        OR: [
          ...(categoryIds.length > 0 ? [{ id: { in: categoryIds } }] : []),
          ...(contestIds.length > 0 ? [{ contestId: { in: contestIds } }] : []),
          ...(eventIds.length > 0 ? [{ contest: { eventId: { in: eventIds } } }] : [])
        ]
      }
    }

    if (userRole === 'AUDITOR') {
      const assignments = await this.prisma.auditorAssignment.findMany({ where: { tenantId, userId, status: 'ACTIVE' } })
      if (assignments.length === 0) return { id: { in: [] } }
      const categoryIds = assignments.map((a) => a.categoryId).filter((id): id is string => !!id)
      const contestIds = assignments.map((a) => a.contestId).filter((id): id is string => !!id)
      const eventIds = assignments.map((a) => a.eventId).filter((id): id is string => !!id)
      return {
        tenantId,
        deletedAt: null,
        OR: [
          ...(categoryIds.length > 0 ? [{ id: { in: categoryIds } }] : []),
          ...(contestIds.length > 0 ? [{ contestId: { in: contestIds } }] : []),
          ...(eventIds.length > 0 ? [{ contest: { eventId: { in: eventIds } } }] : [])
        ]
      }
    }

    if (userRole === 'JUDGE') {
      const user = await this.prisma.user.findFirst({
        where: { id: userId, tenantId },
        select: { judgeId: true }
      })
      if (!user?.judgeId) return { id: { in: [] } }

      const assignments = await this.prisma.assignment.findMany({
        where: {
          tenantId,
          judgeId: user.judgeId,
          status: 'ACTIVE'
        },
        select: { categoryId: true, contestId: true, eventId: true }
      })
      if (assignments.length === 0) return { id: { in: [] } }

      const categoryIds = assignments.map((a) => a.categoryId).filter((id): id is string => !!id)
      const contestIds = assignments.map((a) => a.contestId).filter((id): id is string => !!id)
      const eventIds = assignments.map((a) => a.eventId).filter((id): id is string => !!id)

      return {
        tenantId,
        deletedAt: null,
        OR: [
          ...(categoryIds.length > 0 ? [{ id: { in: categoryIds } }] : []),
          ...(contestIds.length > 0 ? [{ contestId: { in: contestIds } }] : []),
          ...(eventIds.length > 0 ? [{ contest: { eventId: { in: eventIds } } }] : [])
        ]
      }
    }

    return null
  }

  async getScoreReview(
    tenantId: string,
    userId: string,
    userRole: UserRole,
    filters: { contestId?: string; categoryId?: string; contestantId?: string }
  ) {
    const scopedCategoryWhere = await this.buildScopedCategoryFilter(tenantId, userId, userRole)
    if (!scopedCategoryWhere) throw this.forbiddenError('Role not allowed to access score review')

    const categoryRows = await this.prisma.category.findMany({
      where: {
        ...scopedCategoryWhere,
        ...(filters.contestId ? { contestId: filters.contestId } : {}),
        ...(filters.categoryId ? { id: filters.categoryId } : {})
      },
      select: { id: true }
    })

    const categoryIds = categoryRows.map((c) => c.id)

    const judgeFilter = userRole === 'JUDGE'
      ? await this.prisma.user.findFirst({
          where: { id: userId, tenantId },
          select: { judgeId: true }
        })
      : null

    const scores = categoryIds.length > 0
      ? await this.prisma.score.findMany({
          where: {
            tenantId,
            categoryId: { in: categoryIds },
            ...(userRole === 'JUDGE' ? { judgeId: judgeFilter?.judgeId || 'NO_JUDGE' } : {}),
            ...(filters.contestantId ? { contestantId: filters.contestantId } : {})
          },
          select: {
            id: true,
            score: true,
            isCertified: true,
            isLocked: true,
            comment: true,
            createdAt: true,
            updatedAt: true,
            categoryId: true,
            contestantId: true,
            judgeId: true,
            criterionId: true,
            category: {
              select: {
                id: true,
                name: true,
                contest: {
                  select: {
                    id: true,
                    name: true,
                    event: {
                      select: { id: true, name: true }
                    }
                  }
                }
              }
            },
            contestant: { select: { id: true, name: true, contestantNumber: true } },
            judge: { select: { id: true, name: true, email: true } },
            criterion: { select: { id: true, name: true, maxScore: true } }
          },
          orderBy: [
            { category: { contest: { name: 'asc' } } },
            { category: { name: 'asc' } },
            { contestant: { contestantNumber: 'asc' } },
            { judge: { name: 'asc' } }
          ]
        })
      : []

    return scores
  }
}
