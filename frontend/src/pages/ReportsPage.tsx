import React, { useEffect, useMemo, useRef, useState } from 'react'
import { contestsAPI, eventsAPI, reportsAPI } from '../services/api'
import useAuthPermissions from '../hooks/useAuthPermissions'
import { hasPermissionAction, permissionSetFromList } from '../utils/pageAccess'
import {
  DEFAULT_EMAIL_STYLE,
  EMAIL_STYLE_PRESETS,
  buildBrandedEmailHtml,
  getEmailContrastStatus,
  normalizeEmailStyle,
  type EmailStyleConfig,
} from '../utils/emailHtml'
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  TrophyIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { Button, Card, PageHeader, ResponsiveTable } from '../components/ui'
import { safeLocaleString } from '../utils/dateUtils'

type ReportType = 'event' | 'contest' | 'system'
type ExportFormat = 'pdf' | 'excel' | 'csv'

interface BasicOption {
  id: string
  name: string
}

interface ContestOption extends BasicOption {
  eventId: string
}

interface ReportScopeSummary {
  eventId: string | null
  eventName: string | null
  contestIds: string[]
  contestNames: string[]
  filterMode: 'all_contests_in_event' | 'selected_contests' | 'single_contest' | 'system' | null
}

interface ReportInstance {
  id: string
  name: string
  type: string
  format?: string | null
  generatedAt: string
  scopeSummary?: ReportScopeSummary | null
}

interface ReportDetail {
  id: string
  name: string
  type: string
  format?: string | null
  generatedAt: string
  scopeSummary?: ReportScopeSummary | null
  data?: Record<string, any> | null
}

type CommentaryMode = 'PER_CRITERION' | 'PER_CATEGORY' | 'HYBRID'
type CommentaryScope = 'CATEGORY' | 'CONTEST' | 'EVENT'

interface ReportCriterionDrilldown {
  scoreId: string
  criterionId: string | null
  criterionName: string
  score: number | null
  maxScore: number | null
  commentary: string | null
  commentaryUpdatedAt: string | null
}

interface ReportJudgeCategoryDrilldown {
  categoryId: string
  categoryName: string
  commentaryMode: CommentaryMode
  commentaryScope: CommentaryScope
  totalScore: number
  totalPossibleScore: number | null
  commentary: string | null
  commentaryCreatedAt: string | null
  criteria: ReportCriterionDrilldown[]
}

interface ReportContestantJudgeDrilldown {
  judgeId: string
  judgeName: string
  totalScore: number
  totalPossibleScore: number | null
  categories: ReportJudgeCategoryDrilldown[]
}

interface ReportContestantDrilldown {
  contestantId: string
  contestantName: string
  contestantNumber: number | null
  totalScore: number
  totalPossibleScore: number | null
  judgeCount: number
  judges: ReportContestantJudgeDrilldown[]
}

interface ReportContestDrilldown {
  contestId: string
  contestName: string
  eventId: string
  eventName: string
  contestantCount: number
  contestants: ReportContestantDrilldown[]
}

interface ReportDrilldown {
  certifiedOnly: boolean
  contests: ReportContestDrilldown[]
}

const looksLikeHtml = (value: unknown): value is string =>
  typeof value === 'string' && /<\/?[a-z][\s\S]*>/i.test(value)

const parseCsvRows = (value: string): string[][] => {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 26) // header + 25 rows
    .map((line) => line.split(',').map((cell) => cell.trim()))
}

const normalizeScopeSummary = (value: unknown): ReportScopeSummary | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const scope = value as Record<string, unknown>
  return {
    eventId: scope.eventId ? String(scope.eventId) : null,
    eventName: scope.eventName ? String(scope.eventName) : null,
    contestIds: Array.isArray(scope.contestIds)
      ? scope.contestIds.map((contestId) => String(contestId || '')).filter(Boolean)
      : [],
    contestNames: Array.isArray(scope.contestNames)
      ? scope.contestNames.map((contestName) => String(contestName || '')).filter(Boolean)
      : [],
    filterMode:
      scope.filterMode === 'all_contests_in_event' ||
      scope.filterMode === 'selected_contests' ||
      scope.filterMode === 'single_contest' ||
      scope.filterMode === 'system'
        ? scope.filterMode
        : null,
  }
}

const extractScopeSummaryFromReportData = (reportData?: Record<string, any> | null): ReportScopeSummary | null => {
  const metadataScope = normalizeScopeSummary(reportData?.metadata?.scope)
  if (metadataScope) {
    return metadataScope
  }

  if (reportData?.contest?.id) {
    return {
      eventId: reportData?.contest?.event?.id ? String(reportData.contest.event.id) : null,
      eventName: reportData?.contest?.event?.name ? String(reportData.contest.event.name) : null,
      contestIds: [String(reportData.contest.id)],
      contestNames: reportData?.contest?.name ? [String(reportData.contest.name)] : [],
      filterMode: 'single_contest',
    }
  }

  if (reportData?.event?.id) {
    const contests = Array.isArray(reportData.event.contests) ? reportData.event.contests : []
    return {
      eventId: String(reportData.event.id),
      eventName: reportData?.event?.name ? String(reportData.event.name) : null,
      contestIds: contests
        .map((contest: Record<string, unknown>) => String(contest?.id || ''))
        .filter(Boolean),
      contestNames: contests
        .map((contest: Record<string, unknown>) => String(contest?.name || ''))
        .filter(Boolean),
      filterMode: 'all_contests_in_event',
    }
  }

  if (reportData?.metadata?.reportType === 'system_analytics') {
    return {
      eventId: null,
      eventName: null,
      contestIds: [],
      contestNames: [],
      filterMode: 'system',
    }
  }

  return null
}

const buildScopeDescription = (scopeSummary: ReportScopeSummary | null, fallbackEventName?: string | null): string => {
  if (!scopeSummary) {
    return fallbackEventName ? `${fallbackEventName} • all contests` : 'All reports'
  }

  if (scopeSummary.filterMode === 'system') {
    return 'System-wide'
  }

  const eventLabel = scopeSummary.eventName || fallbackEventName || 'Event scope'
  if (scopeSummary.contestNames.length === 0) {
    return `${eventLabel} • all contests`
  }

  return `${eventLabel} • ${scopeSummary.contestNames.join(', ')}`
}

const normalizeCriterionDrilldown = (value: unknown): ReportCriterionDrilldown | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const criterion = value as Record<string, unknown>
  return {
    scoreId: criterion.scoreId ? String(criterion.scoreId) : '',
    criterionId: criterion.criterionId ? String(criterion.criterionId) : null,
    criterionName: criterion.criterionName ? String(criterion.criterionName) : 'Criterion',
    score: typeof criterion.score === 'number' ? criterion.score : null,
    maxScore: typeof criterion.maxScore === 'number' ? criterion.maxScore : null,
    commentary: criterion.commentary ? String(criterion.commentary) : null,
    commentaryUpdatedAt: criterion.commentaryUpdatedAt ? String(criterion.commentaryUpdatedAt) : null,
  }
}

const normalizeJudgeCategoryDrilldown = (value: unknown): ReportJudgeCategoryDrilldown | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const category = value as Record<string, unknown>
  const commentaryMode: CommentaryMode =
    category.commentaryMode === 'PER_CRITERION' ||
    category.commentaryMode === 'PER_CATEGORY' ||
    category.commentaryMode === 'HYBRID'
      ? category.commentaryMode
      : 'PER_CRITERION'
  const commentaryScope: CommentaryScope =
    category.commentaryScope === 'CATEGORY' ||
    category.commentaryScope === 'CONTEST' ||
    category.commentaryScope === 'EVENT'
      ? category.commentaryScope
      : 'CATEGORY'

  return {
    categoryId: category.categoryId ? String(category.categoryId) : '',
    categoryName: category.categoryName ? String(category.categoryName) : 'Category',
    commentaryMode,
    commentaryScope,
    totalScore: typeof category.totalScore === 'number' ? category.totalScore : 0,
    totalPossibleScore: typeof category.totalPossibleScore === 'number' ? category.totalPossibleScore : null,
    commentary: category.commentary ? String(category.commentary) : null,
    commentaryCreatedAt: category.commentaryCreatedAt ? String(category.commentaryCreatedAt) : null,
    criteria: Array.isArray(category.criteria)
      ? category.criteria
          .map((criterion) => normalizeCriterionDrilldown(criterion))
          .filter((criterion): criterion is ReportCriterionDrilldown => Boolean(criterion))
      : [],
  }
}

const normalizeContestantJudgeDrilldown = (value: unknown): ReportContestantJudgeDrilldown | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const judge = value as Record<string, unknown>
  return {
    judgeId: judge.judgeId ? String(judge.judgeId) : '',
    judgeName: judge.judgeName ? String(judge.judgeName) : 'Judge',
    totalScore: typeof judge.totalScore === 'number' ? judge.totalScore : 0,
    totalPossibleScore: typeof judge.totalPossibleScore === 'number' ? judge.totalPossibleScore : null,
    categories: Array.isArray(judge.categories)
      ? judge.categories
          .map((category) => normalizeJudgeCategoryDrilldown(category))
          .filter((category): category is ReportJudgeCategoryDrilldown => Boolean(category))
      : [],
  }
}

const normalizeContestantDrilldown = (value: unknown): ReportContestantDrilldown | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const contestant = value as Record<string, unknown>
  return {
    contestantId: contestant.contestantId ? String(contestant.contestantId) : '',
    contestantName: contestant.contestantName ? String(contestant.contestantName) : 'Contestant',
    contestantNumber: typeof contestant.contestantNumber === 'number' ? contestant.contestantNumber : null,
    totalScore: typeof contestant.totalScore === 'number' ? contestant.totalScore : 0,
    totalPossibleScore: typeof contestant.totalPossibleScore === 'number' ? contestant.totalPossibleScore : null,
    judgeCount: typeof contestant.judgeCount === 'number' ? contestant.judgeCount : 0,
    judges: Array.isArray(contestant.judges)
      ? contestant.judges
          .map((judge) => normalizeContestantJudgeDrilldown(judge))
          .filter((judge): judge is ReportContestantJudgeDrilldown => Boolean(judge))
      : [],
  }
}

const extractReportDrilldown = (reportData?: Record<string, any> | null): ReportDrilldown | null => {
  if (!reportData?.drilldown || typeof reportData.drilldown !== 'object') {
    return null
  }

  const drilldown = reportData.drilldown as Record<string, unknown>
  if (!Array.isArray(drilldown.contests)) {
    return null
  }

  return {
    certifiedOnly: drilldown.certifiedOnly === true,
    contests: drilldown.contests
      .map((contest) => {
        if (!contest || typeof contest !== 'object') {
          return null
        }

        const contestRecord = contest as Record<string, unknown>
        return {
          contestId: contestRecord.contestId ? String(contestRecord.contestId) : '',
          contestName: contestRecord.contestName ? String(contestRecord.contestName) : 'Contest',
          eventId: contestRecord.eventId ? String(contestRecord.eventId) : '',
          eventName: contestRecord.eventName ? String(contestRecord.eventName) : 'Event',
          contestantCount: typeof contestRecord.contestantCount === 'number' ? contestRecord.contestantCount : 0,
          contestants: Array.isArray(contestRecord.contestants)
            ? contestRecord.contestants
                .map((contestant) => normalizeContestantDrilldown(contestant))
                .filter((contestant): contestant is ReportContestantDrilldown => Boolean(contestant))
            : [],
        }
      })
      .filter((contest): contest is ReportContestDrilldown => Boolean(contest)),
  }
}

const formatScoreTotal = (score: number, totalPossibleScore: number | null): string =>
  totalPossibleScore === null ? `${score}` : `${score} / ${totalPossibleScore}`

const ReportsPage: React.FC = () => {
  const hasCompletedInitialHistoryLoad = useRef(false)
  const latestInstancesRequestId = useRef(0)
  const { data: permissionsPayload } = useAuthPermissions()
  const [type, setType] = useState<ReportType>('event')
  const [eventId, setEventId] = useState('')
  const [selectedContestIds, setSelectedContestIds] = useState<string[]>([])
  const [events, setEvents] = useState<BasicOption[]>([])
  const [contests, setContests] = useState<ContestOption[]>([])
  const [isLoadingContests, setIsLoadingContests] = useState(false)
  const [instances, setInstances] = useState<ReportInstance[]>([])
  const [historyStartDate, setHistoryStartDate] = useState('')
  const [historyEndDate, setHistoryEndDate] = useState('')
  const [sendingReportId, setSendingReportId] = useState<string | null>(null)
  const [viewingReport, setViewingReport] = useState<ReportDetail | null>(null)
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null)
  const [isLoadingView, setIsLoadingView] = useState(false)
  const [isLoadingInstances, setIsLoadingInstances] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewText, setPreviewText] = useState<string | null>(null)
  const [emailRecipients, setEmailRecipients] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [emailFormat, setEmailFormat] = useState<ExportFormat>('pdf')
  const [useStyledEmail, setUseStyledEmail] = useState(false)
  const [emailStylePreset, setEmailStylePreset] = useState<string>('default')
  const [emailStyle, setEmailStyle] = useState<EmailStyleConfig>({
    ...DEFAULT_EMAIL_STYLE,
    headerTitle: 'Event Manager Report',
  })
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const csvRows = previewText ? parseCsvRows(previewText) : []
  const styleContrast = getEmailContrastStatus(emailStyle)
  const permissionSet = permissionSetFromList(permissionsPayload?.permissions || [])
  const canWriteReports = hasPermissionAction(permissionSet, 'reports:write')
  const activeEvent = useMemo(
    () => events.find((event) => event.id === eventId) || null,
    [eventId, events],
  )
  const eventScopedContests = useMemo(
    () => (eventId ? contests : []),
    [contests, eventId],
  )
  const selectedContests = useMemo(
    () => eventScopedContests.filter((contest) => selectedContestIds.includes(contest.id)),
    [eventScopedContests, selectedContestIds],
  )
  const activeScopeSummary = useMemo<ReportScopeSummary | null>(() => {
    if (type === 'system') {
      return {
        eventId: null,
        eventName: null,
        contestIds: [],
        contestNames: [],
        filterMode: 'system',
      }
    }

    if (!activeEvent) {
      return null
    }

    return {
      eventId: activeEvent.id,
      eventName: activeEvent.name,
      contestIds: selectedContests.map((contest) => contest.id),
      contestNames: selectedContests.map((contest) => contest.name),
      filterMode:
        selectedContests.length > 0
          ? type === 'contest'
            ? 'single_contest'
            : 'selected_contests'
          : 'all_contests_in_event',
    }
  }, [activeEvent, selectedContests, type])
  const visibleInstances = useMemo(
    () =>
      instances.map((instance) => ({
        ...instance,
        scopeSummary: normalizeScopeSummary(instance.scopeSummary),
      })),
    [instances],
  )
  const viewingScopeSummary = useMemo(
    () => normalizeScopeSummary(viewingReport?.scopeSummary) || extractScopeSummaryFromReportData(viewingReport?.data),
    [viewingReport],
  )
  const viewingDrilldown = useMemo(
    () => extractReportDrilldown(viewingReport?.data),
    [viewingReport],
  )
  const selectedEmailReport = useMemo(
    () => visibleInstances.find((instance) => instance.id === sendingReportId) || null,
    [sendingReportId, visibleInstances],
  )
  const selectedEmailScopeDescription = useMemo(
    () => buildScopeDescription(selectedEmailReport?.scopeSummary || null),
    [selectedEmailReport],
  )
  const activeScopeDescription = useMemo(() => {
    if (type === 'system') {
      return 'System-wide reports'
    }

    if (!activeEvent) {
      return 'Select an event to scope report generation and report history'
    }

    if (selectedContests.length === 0) {
      return `${activeEvent.name} • all contests`
    }

    return `${activeEvent.name} • ${selectedContests.map((contest) => contest.name).join(', ')}`
  }, [activeEvent, selectedContests, type])
  const reportHistoryQuery = useMemo(() => {
    const params: {
      type: ReportType
      eventId?: string
      contestId?: string | string[]
      startDate?: string
      endDate?: string
    } = {
      type,
      ...(historyStartDate ? { startDate: historyStartDate } : {}),
      ...(historyEndDate ? { endDate: historyEndDate } : {}),
    }

    if (type !== 'system' && eventId) {
      params.eventId = eventId
    }

    if (selectedContestIds.length > 0) {
      params.contestId = type === 'contest' ? selectedContestIds[0] : selectedContestIds
    }

    return params
  }, [eventId, historyEndDate, historyStartDate, selectedContestIds, type])

  const loadOptions = async () => {
    const eventResponse = await eventsAPI.getAll().catch(() => ({ data: { data: [] } }))

    const eventData = eventResponse.data?.data || eventResponse.data || []

    const normalizedEvents = Array.isArray(eventData)
      ? eventData.map((e: any) => ({ id: e.id, name: e.name }))
      : []

    setEvents(normalizedEvents.sort((a, b) => a.name.localeCompare(b.name)))
  }

  const loadContestsForEvent = async (selectedEventId: string) => {
    if (!selectedEventId) {
      setContests([])
      setIsLoadingContests(false)
      return
    }

    setIsLoadingContests(true)
    try {
      const contestResponse = await contestsAPI.getByEvent(selectedEventId).catch(() => ({ data: { data: [] } }))
      const contestData = contestResponse.data?.data || contestResponse.data || []
      const normalizedContests = Array.isArray(contestData)
        ? contestData
            .map((contest: any) => ({
              id: contest.id,
              name: contest.name,
              eventId: contest.eventId || contest.event?.id || selectedEventId,
            }))
            .filter((contest: ContestOption) => Boolean(contest.id && contest.eventId))
        : []

      setContests(
        normalizedContests.sort((left, right) =>
          left.name.localeCompare(right.name, undefined, { sensitivity: 'base', numeric: true }),
        ),
      )
    } finally {
      setIsLoadingContests(false)
    }
  }

  const loadInstances = async (
    query: { type: ReportType; eventId?: string; contestId?: string | string[]; startDate?: string; endDate?: string },
  ) => {
    const requestId = latestInstancesRequestId.current + 1
    latestInstancesRequestId.current = requestId
    setIsLoadingInstances(true)
    try {
      const response = await reportsAPI.getAll(query)
      const payload = response.data?.data || response.data || []
      if (latestInstancesRequestId.current === requestId) {
        setInstances(Array.isArray(payload) ? payload : [])
      }
    } finally {
      if (latestInstancesRequestId.current === requestId) {
        setIsLoadingInstances(false)
      }
    }
  }

  useEffect(() => {
    ;(async () => {
      try {
        setIsLoading(true)
        await Promise.all([loadOptions(), loadInstances(reportHistoryQuery)])
        hasCompletedInitialHistoryLoad.current = true
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load reports data')
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (isLoading || !hasCompletedInitialHistoryLoad.current) {
      return
    }

    void loadInstances(reportHistoryQuery).catch((err: any) => {
      setError(err.response?.data?.error || 'Failed to load reports data')
    })
  }, [isLoading, reportHistoryQuery])

  useEffect(() => {
    if (!eventId) {
      setContests([])
      setIsLoadingContests(false)
      return
    }

    void loadContestsForEvent(eventId).catch(() => {
      setContests([])
      setIsLoadingContests(false)
    })
  }, [eventId])

  useEffect(() => {
    setSelectedContestIds((previous) => {
      if (!eventId) {
        return previous.length === 0 ? previous : []
      }

      const allowedContestIds = new Set(eventScopedContests.map((contest) => contest.id))
      const next = previous.filter((contestId) => allowedContestIds.has(contestId))
      if (next.length === previous.length && next.every((contestId, index) => contestId === previous[index])) {
        return previous
      }
      return next
    })
  }, [eventId, eventScopedContests])

  useEffect(() => {
    if (type !== 'contest' || selectedContestIds.length <= 1) {
      return
    }

    setSelectedContestIds((previous) => previous.slice(0, 1))
  }, [selectedContestIds, type])

  const handleGenerateReport = async () => {
    try {
      if (type !== 'system' && !eventId) {
        setError('Select an event before generating an event or contest report')
        return
      }
      if (type === 'contest' && selectedContestIds.length !== 1) {
        setError('Select exactly one contest within the active event for contest report generation')
        return
      }

      setIsGenerating(true)
      setError(null)
      setMessage(null)
      await reportsAPI.generate({
        type,
        ...(type === 'event' ? { eventId } : {}),
        ...(type === 'event' && selectedContestIds.length > 0 ? { contestIds: selectedContestIds } : {}),
        ...(type === 'contest' ? { eventId, contestId: selectedContestIds[0] } : {}),
      })
      setMessage('Report generated successfully')
      await loadInstances(reportHistoryQuery)
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Report generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExport = async (id: string, format: ExportFormat) => {
    try {
      setError(null)
      setMessage(null)
      const response =
        format === 'pdf'
          ? await reportsAPI.exportPdf(id)
          : format === 'excel'
            ? await reportsAPI.exportExcel(id)
            : await reportsAPI.exportCsv(id)
      const blob = new Blob([response.data], {
        type:
          format === 'pdf'
            ? 'application/pdf'
            : format === 'excel'
              ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              : 'text/csv',
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${id}.${format === 'excel' ? 'xlsx' : format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      const selectedReport = visibleInstances.find((instance) => instance.id === id)
      const reportLabel = selectedReport?.name || `${selectedReport?.type || 'Report'} report`
      const attachmentLabel = format === 'excel' ? 'Excel' : format.toUpperCase()
      setMessage(`${attachmentLabel} export started for ${reportLabel}`)
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to export ${format.toUpperCase()}`)
    }
  }

  const handleSend = async () => {
    if (!sendingReportId) return
    const selectedReport = selectedEmailReport
    const recipients = Array.from(new Set(emailRecipients
      .split(/[,\n;]+/)
      .map((v) => v.trim())
      .filter(Boolean)))
    if (recipients.length === 0) {
      setError('Enter at least one email recipient')
      return
    }

    const invalidRecipients = recipients.filter((recipient) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))
    if (invalidRecipients.length > 0) {
      setError(`Invalid email address(es): ${invalidRecipients.join(', ')}`)
      return
    }

    try {
      setIsSendingEmail(true)
      setError(null)
      const trimmedSubject = emailSubject.trim()
      const trimmedMessage = emailMessage.trim()
      const reportLabel = selectedReport?.name || `${selectedReport?.type || 'Report'} report`
      const generatedAt = selectedReport?.generatedAt || new Date().toISOString()
      const normalizedStyle = normalizeEmailStyle(emailStyle)
      const attachmentLabel = emailFormat === 'excel' ? 'Excel' : emailFormat.toUpperCase()
      const html = useStyledEmail
        ? buildBrandedEmailHtml({
            subject: trimmedSubject || `${reportLabel} delivery`,
            title: reportLabel,
            message: trimmedMessage || 'Please find the attached report.',
            preheader: `${reportLabel} delivery`,
            note: 'The requested report is attached to this email.',
            detailRows: [
              { label: 'Generated', value: new Date(generatedAt).toLocaleString() },
              { label: 'Report', value: reportLabel },
              { label: 'Scope', value: selectedEmailScopeDescription },
              { label: 'Attachment', value: attachmentLabel },
            ],
            style: normalizedStyle,
          })
        : undefined

      const response = await reportsAPI.sendEmail({
        reportId: sendingReportId,
        recipients,
        subject: trimmedSubject || undefined,
        message: trimmedMessage || undefined,
        format: emailFormat,
        html,
      })
      const payload = response.data?.data || {}
      const sent = Number(payload.sent ?? 0)
      const failed = Number(payload.failed ?? 0)
      const skipped = Number(payload.skipped ?? 0)
      const responseMessage = response.data?.message || 'Report email request completed'
      setMessage(`${responseMessage} (${attachmentLabel}; Sent: ${sent}, Skipped: ${skipped}, Failed: ${failed})`)
      resetEmailComposer()
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to send report email')
    } finally {
      setIsSendingEmail(false)
    }
  }

  const resetEmailComposer = () => {
    setSendingReportId(null)
    setEmailRecipients('')
    setEmailSubject('')
    setEmailMessage('')
    setEmailFormat('pdf')
    setUseStyledEmail(false)
  }

  const applyEmailStylePreset = (presetId: string) => {
    setEmailStylePreset(presetId)
    const preset = EMAIL_STYLE_PRESETS.find((item) => item.id === presetId)
    if (preset) {
      setEmailStyle({
        ...preset.style,
        headerTitle: 'Event Manager Report',
      })
    }
  }

  const updateEmailStyle = (patch: Partial<EmailStyleConfig>) => {
    setEmailStyle((prev) => ({ ...prev, ...patch }))
    setEmailStylePreset('custom')
  }

  const handleView = async (id: string) => {
    try {
      setError(null)
      setIsLoadingView(true)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
      setPreviewText(null)
      const response = await reportsAPI.getById(id)
      const payload = response.data?.data || response.data || null
      setViewingReport(payload)
      if (extractReportDrilldown(payload?.data)) {
        return
      }
      try {
        // Prefer a rendered preview (PDF) even when stored format metadata is missing/inaccurate.
        const blobResponse = await reportsAPI.exportPdf(id)
        const url = URL.createObjectURL(new Blob([blobResponse.data], { type: 'application/pdf' }))
        setPreviewUrl(url)
      } catch {
        const reportFormat = String(payload?.format || '').toLowerCase()
        if (reportFormat.includes('csv') || reportFormat.includes('excel')) {
          const blobResponse = await reportsAPI.exportCsv(id)
          const text = await new Blob([blobResponse.data], { type: 'text/csv' }).text()
          setPreviewText(text)
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load report preview')
    } finally {
      setIsLoadingView(false)
    }
  }

  const handleDeleteReport = async (id: string) => {
    if (!window.confirm('Delete this generated report? This cannot be undone.')) {
      return
    }

    try {
      setDeletingReportId(id)
      setError(null)
      await reportsAPI.delete(id)
      if (viewingReport?.id === id) {
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl)
          setPreviewUrl(null)
        }
        setPreviewText(null)
        setViewingReport(null)
      }
      setMessage('Report deleted successfully')
      await loadInstances(reportHistoryQuery)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete report')
    } finally {
      setDeletingReportId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Loading reports...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="cgr-page-container space-y-6">
        <PageHeader
          title="Reports & Analytics"
          subtitle="Generate reports and export/download generated artifacts."
          icon={ChartBarIcon}
        />

        {error && <div className="p-3 rounded bg-red-50 text-red-700 border border-red-200">{error}</div>}
        {message && <div className="p-3 rounded bg-green-50 text-green-700 border border-green-200">{message}</div>}

        <Card className="rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Generate Report</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pages-reportspage-1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
              <select id="pages-reportspage-1"
                data-testid="reports-type-select"
                value={type}
                onChange={(e) => setType(e.target.value as ReportType)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              >
                <option value="event">Event</option>
                <option value="contest">Contest</option>
                <option value="system">System</option>
              </select>
            </div>

            {type !== 'system' && (
              <div>
                <label htmlFor="pages-reportspage-2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Event</label>
                <select id="pages-reportspage-2"
                  data-testid="reports-event-select"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                >
                  <option value="">Select event...</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>{event.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div
            data-testid="reports-active-scope"
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Active Scope
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
              {activeScopeDescription}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {type === 'system'
                ? 'System analytics ignore event and contest drill-in.'
                : type === 'contest'
                  ? 'Contest reports require one contest inside the selected event.'
                  : 'Leave all contests unselected to include the full selected event.'}
            </p>
          </div>

          {type !== 'system' && activeEvent && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {type === 'contest' ? 'Contest Selection' : 'Contest Scope'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {type === 'contest'
                      ? 'Select one contest inside the active event.'
                      : 'Optional: select one or more contests to narrow the event report and report history.'}
                  </p>
                </div>
                {selectedContestIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedContestIds([])}
                    className="px-3 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    Clear
                  </button>
                )}
              </div>

              {isLoadingContests ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Loading contests for the selected event...
                </p>
              ) : eventScopedContests.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No contests are available for the selected event.
                </p>
              ) : type === 'contest' ? (
                <div>
                  <label htmlFor="pages-reportspage-3" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contest
                  </label>
                  <select
                    id="pages-reportspage-3"
                    data-testid="reports-contest-select"
                    value={selectedContestIds[0] || ''}
                    onChange={(e) => setSelectedContestIds(e.target.value ? [e.target.value] : [])}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                  >
                    <option value="">Select contest...</option>
                    {eventScopedContests.map((contest) => (
                      <option key={contest.id} value={contest.id}>{contest.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div
                  data-testid="reports-contest-scope-options"
                  className="max-h-48 overflow-y-auto space-y-2"
                >
                  {eventScopedContests.map((contest) => {
                    const isChecked = selectedContestIds.includes(contest.id)
                    return (
                      <label
                        key={contest.id}
                        className="flex items-center gap-3 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setSelectedContestIds((previous) => {
                              if (e.target.checked) {
                                return Array.from(new Set([...previous, contest.id]))
                              }
                              return previous.filter((contestId) => contestId !== contest.id)
                            })
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                        />
                        <span>{contest.name}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {canWriteReports && (
            <Button
              onClick={handleGenerateReport}
              disabled={isGenerating}
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate Report'}
            </Button>
          )}
        </Card>

        <Card className="rounded-lg p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Generated Reports</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {type === 'system'
                  ? 'Showing system reports'
                  : eventId
                    ? `Showing ${visibleInstances.length} report${visibleInstances.length === 1 ? '' : 's'} for ${buildScopeDescription(activeScopeSummary, activeEvent?.name)}`
                    : 'Showing all generated reports'}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-end">
              <div>
                <label htmlFor="pages-reportspage-10" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Generated after
                </label>
                <input
                  id="pages-reportspage-10"
                  data-testid="reports-start-date-filter"
                  type="date"
                  value={historyStartDate}
                  onChange={(e) => setHistoryStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label htmlFor="pages-reportspage-11" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Generated before
                </label>
                <input
                  id="pages-reportspage-11"
                  data-testid="reports-end-date-filter"
                  type="date"
                  value={historyEndDate}
                  onChange={(e) => setHistoryEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setHistoryStartDate('')
                    setHistoryEndDate('')
                  }}
                  disabled={!historyStartDate && !historyEndDate}
                  className="px-3 py-2 text-xs rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Clear dates
                </button>
                {isLoadingInstances && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">Refreshing…</span>
                )}
              </div>
            </div>
          </div>
          {visibleInstances.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {instances.length === 0
                ? 'No reports generated yet.'
                : 'No reports match the current event and contest scope.'}
            </p>
          ) : (
            <div className="space-y-3">
              {visibleInstances.map((instance) => (
                <div key={instance.id} data-testid="reports-generated-item" className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {instance.name || `${instance.type} report`}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-3">
                        <span className="flex items-center"><CalendarIcon className="h-4 w-4 mr-1" />{safeLocaleString(instance.generatedAt)}</span>
                        <span className="flex items-center"><TrophyIcon className="h-4 w-4 mr-1" />{instance.type}</span>
                        <span className="flex items-center"><CheckCircleIcon className="h-4 w-4 mr-1" />{instance.format || 'N/A'}</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {buildScopeDescription(normalizeScopeSummary(instance.scopeSummary))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => handleView(instance.id)} className="px-3 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200">View</button>
                      <button onClick={() => handleExport(instance.id, 'pdf')} className="px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200">PDF</button>
                      <button onClick={() => handleExport(instance.id, 'excel')} className="px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200">Excel</button>
                      <button onClick={() => handleExport(instance.id, 'csv')} className="px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200">CSV</button>
                      {canWriteReports && (
                        <>
                          <button
                            onClick={() => setSendingReportId(instance.id)}
                            className="px-3 py-1 text-xs rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex items-center"
                          >
                            <EnvelopeIcon className="h-4 w-4 mr-1" />
                            Email
                          </button>
                          <button
                            onClick={() => handleDeleteReport(instance.id)}
                            disabled={deletingReportId === instance.id}
                            className="px-3 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60 flex items-center"
                          >
                            <TrashIcon className="h-4 w-4 mr-1" />
                            {deletingReportId === instance.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {sendingReportId && canWriteReports && (
          <div className="cgr-modal-overlay">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-xl w-full p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Report</h3>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedEmailReport?.name || 'Selected report'}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {selectedEmailReport?.type || 'report'} • {selectedEmailScopeDescription}
                </p>
              </div>
              <div>
                <label htmlFor="pages-reportspage-12" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Attachment format
                </label>
                <select
                  id="pages-reportspage-12"
                  data-testid="reports-email-format-select"
                  value={emailFormat}
                  onChange={(e) => setEmailFormat(e.target.value as ExportFormat)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                >
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Optional custom subject"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              />
              <textarea
                rows={3}
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Optional message shown in the email body"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              />
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                <label htmlFor="pages-reportspage-4" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={useStyledEmail}
                    onChange={(e) => setUseStyledEmail(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 rounded"
                  />
                  Apply custom report email styling
                </label>

                {useStyledEmail && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="min-w-[180px] flex-1">
                        <label htmlFor="pages-reportspage-4" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Style preset</label>
                        <select id="pages-reportspage-4"
                          value={emailStylePreset}
                          onChange={(e) => applyEmailStylePreset(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                        >
                          {EMAIL_STYLE_PRESETS.map((preset) => (
                            <option key={preset.id} value={preset.id}>{preset.label}</option>
                          ))}
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => applyEmailStylePreset('default')}
                        className="px-3 py-2 text-xs rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        Reset style
                      </button>
                    </div>
                    {!styleContrast.passes && (
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Text contrast is low on light backgrounds ({styleContrast.ratio.toFixed(2)}:1). Recommended text color: {styleContrast.recommendedTextColor}.
                      </p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="pages-reportspage-5" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Header title</label>
                      <input id="pages-reportspage-5"
                        type="text"
                        value={emailStyle.headerTitle}
                        onChange={(e) => updateEmailStyle({ headerTitle: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label htmlFor="pages-reportspage-6" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Footer text</label>
                      <input id="pages-reportspage-6"
                        type="text"
                        value={emailStyle.footerText}
                        onChange={(e) => updateEmailStyle({ footerText: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label htmlFor="pages-reportspage-7" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Primary color</label>
                      <input id="pages-reportspage-7"
                        type="color"
                        value={emailStyle.primaryColor}
                        onChange={(e) => updateEmailStyle({ primaryColor: e.target.value })}
                        className="h-10 w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label htmlFor="pages-reportspage-8" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Background color</label>
                      <input id="pages-reportspage-8"
                        type="color"
                        value={emailStyle.backgroundColor}
                        onChange={(e) => updateEmailStyle({ backgroundColor: e.target.value })}
                        className="h-10 w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label htmlFor="pages-reportspage-9" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Text color</label>
                      <input id="pages-reportspage-9"
                        type="color"
                        value={emailStyle.textColor}
                        onChange={(e) => updateEmailStyle({ textColor: e.target.value })}
                        className="h-10 w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                      />
                    </div>
                  </div>
                  </div>
                )}
              </div>
              <textarea
                rows={4}
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                placeholder="recipient1@example.com, recipient2@example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleSend}
                  disabled={isSendingEmail}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-60"
                >
                  {isSendingEmail ? 'Sending...' : 'Send'}
                </button>
                <button
                  onClick={resetEmailComposer}
                  className="flex-1 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {viewingReport && (
          <div className="cgr-modal-overlay">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{viewingReport.name || 'Report Preview'}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {viewingReport.type} • {safeLocaleString(viewingReport.generatedAt)}
                  </p>
                  {viewingScopeSummary && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {buildScopeDescription(viewingScopeSummary)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (previewUrl) {
                      URL.revokeObjectURL(previewUrl)
                      setPreviewUrl(null)
                    }
                    setPreviewText(null)
                    setViewingReport(null)
                  }}
                  className="px-3 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
                >
                  Close
                </button>
              </div>

              {isLoadingView ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">Loading preview...</div>
              ) : (
                <div className="space-y-3">
                  {previewUrl ? (
                    <iframe
                      title="Report Preview"
                      className="w-full h-[60vh] border border-gray-200 dark:border-gray-700 rounded"
                      src={previewUrl}
                    />
                  ) : previewText ? (
                    csvRows.length > 0 ? (
                      <>
                        <ResponsiveTable className="border border-gray-200 dark:border-gray-700 rounded">
                          <table className="min-w-full text-xs">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                              <tr>
                                {csvRows[0]?.map((header, index) => (
                                  <th key={`h-${index}`} className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                                    {header || `Column ${index + 1}`}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {csvRows.slice(1).map((row, rowIndex) => (
                                <tr key={`r-${rowIndex}`} className="border-t border-gray-200 dark:border-gray-700">
                                  {row.map((cell, cellIndex) => (
                                    <td key={`c-${rowIndex}-${cellIndex}`} className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </ResponsiveTable>
                        {previewText.split(/\r?\n/).filter(Boolean).length > 26 && (
                          <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border border-t-0 border-gray-200 dark:border-gray-700 rounded-b">
                            Showing first 25 rows. Use CSV export for full data.
                          </div>
                        )}
                      </>
                    ) : (
                      <pre className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-4 overflow-x-auto whitespace-pre-wrap">
                        {previewText}
                      </pre>
                    )
                  ) : looksLikeHtml(viewingReport.data?.['html']) ? (
                    <iframe
                      title="Report Preview"
                      className="w-full h-[60vh] border border-gray-200 dark:border-gray-700 rounded"
                      sandbox="allow-same-origin"
                      srcDoc={String(viewingReport.data?.['html'])}
                    />
                  ) : viewingDrilldown ? (
                    <div className="space-y-4" data-testid="reports-drilldown-preview">
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {viewingDrilldown.certifiedOnly
                          ? 'Certified scores only. Commentary reflects the most recent applicable saved comments.'
                          : 'Structured report preview.'}
                      </div>
                      {viewingDrilldown.contests.length === 0 ||
                      viewingDrilldown.contests.every((contest) => contest.contestants.length === 0) ? (
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-6 text-sm text-gray-600 dark:text-gray-300">
                          No certified contestant results are available in this report scope yet.
                        </div>
                      ) : (
                        viewingDrilldown.contests.map((contest) => (
                          <section
                            key={contest.contestId}
                            data-testid="reports-drilldown-contest"
                            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                          >
                            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                {contest.contestName}
                              </div>
                              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {contest.eventName} • {contest.contestantCount} contestant{contest.contestantCount === 1 ? '' : 's'}
                              </div>
                            </div>
                            <div className="space-y-3 p-4">
                              {contest.contestants.map((contestant) => (
                                <details
                                  key={contestant.contestantId}
                                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                                >
                                  <summary className="cursor-pointer list-none px-4 py-3">
                                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                      <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                          {contestant.contestantNumber !== null
                                            ? `#${contestant.contestantNumber} ${contestant.contestantName}`
                                            : contestant.contestantName}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                          {contestant.judgeCount} judge{contestant.judgeCount === 1 ? '' : 's'}
                                        </div>
                                      </div>
                                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {formatScoreTotal(contestant.totalScore, contestant.totalPossibleScore)}
                                      </div>
                                    </div>
                                  </summary>
                                  <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                                    {contestant.judges.map((judge) => (
                                      <details
                                        key={judge.judgeId}
                                        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                                      >
                                        <summary className="cursor-pointer list-none px-4 py-3">
                                          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                              {judge.judgeName}
                                            </div>
                                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                              {formatScoreTotal(judge.totalScore, judge.totalPossibleScore)}
                                            </div>
                                          </div>
                                        </summary>
                                        <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                                          {judge.categories.map((category) => (
                                            <div
                                              key={`${judge.judgeId}-${category.categoryId}`}
                                              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4"
                                            >
                                              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                                <div>
                                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {category.categoryName}
                                                  </div>
                                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {category.commentaryMode.replace(/_/g, ' ')} • {category.commentaryScope.toLowerCase()} scoped
                                                  </div>
                                                </div>
                                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                  {formatScoreTotal(category.totalScore, category.totalPossibleScore)}
                                                </div>
                                              </div>
                                              {category.commentary && (
                                                <div className="mt-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2">
                                                  <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                    Category Commentary
                                                  </div>
                                                  <div className="mt-1 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                                                    {category.commentary}
                                                  </div>
                                                  {category.commentaryCreatedAt && (
                                                    <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                                                      Saved {safeLocaleString(category.commentaryCreatedAt)}
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                              <div className="mt-3 space-y-2">
                                                {category.criteria.map((criterion) => (
                                                  <div
                                                    key={criterion.scoreId}
                                                    className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
                                                  >
                                                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                                      <div className="text-sm text-gray-900 dark:text-white">
                                                        {criterion.criterionName}
                                                      </div>
                                                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {criterion.score === null
                                                          ? 'No score'
                                                          : formatScoreTotal(criterion.score, criterion.maxScore)}
                                                      </div>
                                                    </div>
                                                    {criterion.commentary && (
                                                      <div className="mt-2 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                                                        {criterion.commentary}
                                                      </div>
                                                    )}
                                                    {criterion.commentaryUpdatedAt && (
                                                      <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                                                        Saved {safeLocaleString(criterion.commentaryUpdatedAt)}
                                                      </div>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </details>
                                    ))}
                                  </div>
                                </details>
                              ))}
                            </div>
                          </section>
                        ))
                      )}
                    </div>
                  ) : viewingReport.data && Object.keys(viewingReport.data).length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {Object.entries(viewingReport.data).slice(0, 6).map(([key, value]) => (
                          <div key={key} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-3">
                            <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{key}</dt>
                            <dd className="mt-1 font-medium text-gray-900 dark:text-white">
                              {typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean'
                                ? String(value)
                                : Array.isArray(value)
                                  ? `${value.length} items`
                                  : value && typeof value === 'object'
                                    ? `${Object.keys(value as Record<string, unknown>).length} fields`
                                    : 'N/A'}
                            </dd>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Structured preview shown. Expand raw data below for complete payload details.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-4">
                      <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div><dt className="text-gray-500">Type</dt><dd className="font-medium">{viewingReport.type}</dd></div>
                        <div><dt className="text-gray-500">Generated</dt><dd className="font-medium">{safeLocaleString(viewingReport.generatedAt)}</dd></div>
                        <div><dt className="text-gray-500">Format</dt><dd className="font-medium">{viewingReport.format || 'N/A'}</dd></div>
                        <div><dt className="text-gray-500">Name</dt><dd className="font-medium">{viewingReport.name}</dd></div>
                      </dl>
                    </div>
                  )}
                  {!previewUrl && !previewText && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Rendered file preview is not available for this report type. Use PDF/Excel/CSV export buttons for full output.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReportsPage
