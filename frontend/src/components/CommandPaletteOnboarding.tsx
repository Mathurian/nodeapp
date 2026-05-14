import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CommandLineIcon,
  KeyIcon,
  LightBulbIcon,
  MapIcon,
  QueueListIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { isStandaloneAppContext } from '../utils/fileViewer'
import {
  ROLE_WELCOME_GUIDE_DISABLED_STORAGE_PREFIX,
  ROLE_WELCOME_GUIDE_FORCE_OPEN_STORAGE_KEY,
  ROLE_WELCOME_GUIDE_OPEN_EVENT,
  ROLE_WELCOME_GUIDE_SEEN_STORAGE_PREFIX,
  ROLE_WELCOME_GUIDE_VERSION,
} from '../constants/onboarding'

interface GuideUser {
  id?: string
  role?: string
  tenantId?: string
  tenant?: {
    id?: string | null
    slug?: string | null
  } | null
}

interface RoleGuideFeature {
  name: string
  description: string
}

interface RoleGuideContent {
  roleLabel: string
  summary: string
  primaryFeatures: RoleGuideFeature[]
  workflow: string[]
  roleTips: string[]
}

interface CommandPaletteOnboardingProps {
  onComplete?: (options?: { openCommandPalette?: boolean }) => void
  isAuthenticated: boolean
  user?: GuideUser | null
}

const GUIDE_VERSION = ROLE_WELCOME_GUIDE_VERSION
const FORCE_OPEN_STORAGE_KEY = ROLE_WELCOME_GUIDE_FORCE_OPEN_STORAGE_KEY
const GUIDE_OPEN_EVENT = ROLE_WELCOME_GUIDE_OPEN_EVENT
const GUIDE_SEEN_STORAGE_PREFIX = ROLE_WELCOME_GUIDE_SEEN_STORAGE_PREFIX
const GUIDE_DISABLED_STORAGE_PREFIX = ROLE_WELCOME_GUIDE_DISABLED_STORAGE_PREFIX

const ROLE_GUIDES: Record<string, RoleGuideContent> = {
  SUPER_ADMIN: {
    roleLabel: 'Super Admin',
    summary: 'You manage platform-wide controls, tenant governance, and operational health.',
    primaryFeatures: [
      { name: 'Tenants', description: 'Create and maintain tenant boundaries, slugs, and admin ownership.' },
      { name: 'Settings', description: 'Manage global defaults for security, email, backups, and policy.' },
      { name: 'Permissions', description: 'Control role capability surfaces and access policy behavior.' },
      { name: 'Monitoring', description: 'Review Grafana/Prometheus health and performance signals.' },
      { name: 'Backups', description: 'Configure platform backup posture and recovery readiness.' },
    ],
    workflow: [
      'Confirm tenant and environment scope before making system changes.',
      'Update policy and configuration settings in global scope first.',
      'Validate system health and logs after major changes.',
      'Audit backups and recovery posture on a recurring schedule.',
    ],
    roleTips: [
      'Use tenant scoping intentionally when reviewing data and configuration.',
      'Treat default tenant as system-management scope only.',
    ],
  },
  ADMIN: {
    roleLabel: 'Admin',
    summary: 'You run day-to-day operations for event setup, user access, and publication flow.',
    primaryFeatures: [
      { name: 'Events / Contests / Categories', description: 'Build and maintain scoring structure.' },
      { name: 'Users', description: 'Create and manage judges, contestants, and support roles.' },
      { name: 'Assignments', description: 'Assign users to contest/category responsibility.' },
      { name: 'Certifications', description: 'Track stage progression and resolve blockers.' },
      { name: 'Results / Reports', description: 'Publish approved outcomes and distribute reporting outputs.' },
    ],
    workflow: [
      'Configure event structure and validate category-level scoring settings.',
      'Import or create users, then validate assignments.',
      'Monitor certification progression and resolve governance issues.',
      'Publish winners/results only after all required stages complete.',
    ],
    roleTips: [
      'Use reports and notifications to catch stalled certification states early.',
      'Keep assignment changes coordinated with active scoring sessions.',
    ],
  },
  ORGANIZER: {
    roleLabel: 'Organizer',
    summary: 'You coordinate event execution, scoring governance, and results publication.',
    primaryFeatures: [
      { name: 'Events', description: 'Run event operations and readiness checks.' },
      { name: 'Assignments', description: 'Coordinate staffing and scoring coverage.' },
      { name: 'Certifications', description: 'Track stage gates through tally/audit/board.' },
      { name: 'Winners', description: 'Publish approved outcomes to authorized audiences.' },
      { name: 'Reports', description: 'Export event status and final result summaries.' },
    ],
    workflow: [
      'Validate staffing and assignments before scoring starts.',
      'Monitor certification progression and unblock workflow issues.',
      'Confirm board-ready status before publishing winners.',
      'Share final reporting outputs for post-event review.',
    ],
    roleTips: [
      'Use notifications to monitor pending certifications in real time.',
      'Recheck visibility settings before publishing final results.',
    ],
  },
  BOARD: {
    roleLabel: 'Board',
    summary: 'You provide final oversight and approvals for certification and publication readiness.',
    primaryFeatures: [
      { name: 'Board Certifications', description: 'Review and approve board-stage certifications.' },
      { name: 'Certifications', description: 'Track upstream stage completion and readiness.' },
      { name: 'Published Results', description: 'Confirm publish state and final result presentation after approval.' },
      { name: 'Score Governance', description: 'Review remediation or exception workflows.' },
    ],
    workflow: [
      'Review tally/auditor completion before board approval.',
      'Validate certification card details and sign off when ready.',
      'Coordinate with organizers for publication timing.',
    ],
    roleTips: [
      'Use certification overview filters to focus only pending board actions.',
      'Verify published state directly on winners/results views.',
    ],
  },
  JUDGE: {
    roleLabel: 'Judge',
    summary: 'You score assigned contestants and certify completion for your scoring stage.',
    primaryFeatures: [
      { name: 'Assigned Scoring', description: 'Enter and update scores for the contestants and categories assigned to you.' },
      { name: 'Contestant Sign-Off', description: 'Certify the currently selected contestant from within scoring when your entries are complete.' },
      { name: 'Score Governance', description: 'Request uncertify or remediation when a correction is needed.' },
    ],
    workflow: [
      'Select assigned contest and category before entering scores.',
      'Complete score entry and verify values before signing the selected contestant in scoring.',
      'Use uncertify/governance only when correction is required.',
    ],
    roleTips: [
      'Validate contestant/context selection to avoid cross-assignment confusion.',
      'Certification for judges happens in the scoring workflow, not in the shared certifications workspace.',
    ],
  },
  TALLY_MASTER: {
    roleLabel: 'Tally Master',
    summary: 'You verify aggregate score integrity and certify tally readiness.',
    primaryFeatures: [
      { name: 'Tally Dashboard', description: 'Review aggregated scoring state and completion.' },
      { name: 'Tally Certifications', description: 'Certify tally stage for eligible categories.' },
      { name: 'Governance Queue', description: 'Review exception and correction requests before certification.' },
    ],
    workflow: [
      'Review judge completion and score consistency.',
      'Certify tally stage only when inputs are complete.',
      'Coordinate with auditors on any discrepancies.',
    ],
    roleTips: [
      'Use the tally dashboard and certification views to isolate incomplete categories quickly.',
      'Escalate anomalies through governance before certification.',
    ],
  },
  AUDITOR: {
    roleLabel: 'Auditor',
    summary: 'You validate score integrity and certify audit-stage completion.',
    primaryFeatures: [
      { name: 'Pending Auditor Certifications', description: 'Review categories awaiting auditor action.' },
      { name: 'Certifications', description: 'Inspect certification state and complete audit-stage review.' },
      { name: 'Certification Status', description: 'Check overall audit readiness and prior completion state.' },
      { name: 'Audit Log', description: 'Track prior audit actions and outcomes.' },
    ],
    workflow: [
      'Review pending auditor certifications and verify upstream tally completion.',
      'Confirm score integrity and exception handling.',
      'Certify audit stage when review requirements are met.',
    ],
    roleTips: [
      'Use audit logs to verify prior adjustments before sign-off.',
      'Some screens may still use older labels such as Pending Audits or Final Certification for the same auditor certification flow.',
      'Confirm governance actions are resolved before audit-stage sign-off.',
    ],
  },
  EMCEE: {
    roleLabel: 'Emcee',
    summary: 'You run scripts and present officially published event outcomes.',
    primaryFeatures: [
      { name: 'Emcee Dashboard', description: 'Access live operational script controls.' },
      { name: 'Presentation Scripts', description: 'Load and present approved script content.' },
      { name: 'Published Winners', description: 'View published result sets only.' },
    ],
    workflow: [
      'Open scripts and verify event/contest context.',
      'Use published winner data for announcements.',
      'Coordinate with organizers for timing and sequence updates.',
    ],
    roleTips: [
      'Refresh scripts and winners pages before key announcements.',
      'Pure emcee access is for presentation and event flow, not template or system-wide script administration.',
      'Use mobile-safe layout controls when running from PWA.',
    ],
  },
  CONTESTANT: {
    roleLabel: 'Contestant',
    summary: 'You can view allowed result information and manage your profile details.',
    primaryFeatures: [
      { name: 'Released Results', description: 'View only the result scopes released by the event visibility policy.' },
      { name: 'Profile', description: 'Review and manage your own user details.' },
      { name: 'Notifications', description: 'Track announcements relevant to your tenant/event.' },
    ],
    workflow: [
      'Check whether your event currently exposes event, contest, or category results.',
      'Review profile information and contact details.',
      'Monitor notifications for event updates.',
    ],
    roleTips: [
      'If results are unavailable, visibility may still be restricted for your event.',
      'Use notifications to track publication announcements.',
    ],
  },
}

const DEFAULT_ROLE_GUIDE: RoleGuideContent = {
  roleLabel: 'User',
  summary: 'Welcome to Event Manager. Your available pages and actions follow your role assignments.',
  primaryFeatures: [
    { name: 'Dashboard', description: 'Your role-based landing page and quick actions.' },
    { name: 'Navigation', description: 'Use the side menu for role-allowed pages.' },
    { name: 'Notifications', description: 'Track alerts and status updates for your work.' },
  ],
  workflow: [
    'Start from dashboard quick actions.',
    'Use role-allowed pages in navigation to complete your tasks.',
    'Review notifications and profile settings regularly.',
  ],
  roleTips: [
    'Permissions and page availability are role-based by tenant scope.',
  ],
}

const normalizeRole = (role?: string | null): string => String(role || '').trim().toUpperCase()

const buildScopedStorageKey = (prefix: string, user: GuideUser | null | undefined, normalizedRole: string): string => {
  const tenantScope = String(user?.tenantId || user?.tenant?.id || 'no-tenant')
  const userScope = String(user?.id || 'anonymous')
  const roleScope = normalizedRole || 'UNKNOWN'
  return `${prefix}:${GUIDE_VERSION}:${tenantScope}:${userScope}:${roleScope}`
}

const detectModifierKey = (): 'Cmd' | 'Ctrl' => {
  if (typeof window === 'undefined') return 'Ctrl'
  const platform = String(window.navigator?.platform || '').toLowerCase()
  return /(mac|iphone|ipad|ipod)/.test(platform) ? 'Cmd' : 'Ctrl'
}

const detectTouchPrimary = (): boolean => {
  if (typeof window === 'undefined') return false
  if ((window.navigator?.maxTouchPoints || 0) > 0) return true
  return window.matchMedia?.('(pointer: coarse)').matches === true
}

const CommandPaletteOnboarding: React.FC<CommandPaletteOnboardingProps> = ({
  onComplete,
  isAuthenticated,
  user,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [hasShownAfterLogin, setHasShownAfterLogin] = useState(false)
  const [modifierKey, setModifierKey] = useState<'Cmd' | 'Ctrl'>('Ctrl')
  const [isTouchPrimary, setIsTouchPrimary] = useState(false)
  const [isStandalonePwa, setIsStandalonePwa] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const normalizedRole = useMemo(() => normalizeRole(user?.role), [user?.role])
  const roleGuide = useMemo(() => ROLE_GUIDES[normalizedRole] || DEFAULT_ROLE_GUIDE, [normalizedRole])
  const seenStorageKey = useMemo(
    () => buildScopedStorageKey(GUIDE_SEEN_STORAGE_PREFIX, user, normalizedRole),
    [user, normalizedRole]
  )
  const disabledStorageKey = useMemo(
    () => buildScopedStorageKey(GUIDE_DISABLED_STORAGE_PREFIX, user, normalizedRole),
    [user, normalizedRole]
  )

  const commandPaletteTip = useMemo(() => {
    if (isTouchPrimary) {
      if (isStandalonePwa) {
        return 'In the installed app, use the top search control to open command search quickly.'
      }
      return 'On mobile browser, use the top search control to quickly find pages and actions.'
    }
    return `Press ${modifierKey}+K to open command search from anywhere in the app.`
  }, [isTouchPrimary, isStandalonePwa, modifierKey])

  const steps = useMemo(
    () => [
      {
        title: `Welcome, ${roleGuide.roleLabel}`,
        description: roleGuide.summary,
        icon: MapIcon,
        kind: 'workspace' as const,
      },
      {
        title: `${roleGuide.roleLabel} Workflow`,
        description: 'This is the typical sequence for your role in Event Manager.',
        icon: QueueListIcon,
        kind: 'workflow' as const,
      },
      {
        title: 'Efficiency Tips',
        description: 'Use these shortcuts and patterns to move faster with fewer errors.',
        icon: LightBulbIcon,
        kind: 'tips' as const,
      },
    ],
    [roleGuide]
  )

  useEffect(() => {
    setModifierKey(detectModifierKey())
    setIsTouchPrimary(detectTouchPrimary())
    setIsStandalonePwa(isStandaloneAppContext())
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setIsOpen(false)
      setHasShownAfterLogin(false)
      setCurrentStep(0)
      return
    }
  }, [isAuthenticated])

  useEffect(() => {
    setHasShownAfterLogin(false)
  }, [seenStorageKey, disabledStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOpenGuide = () => {
      if (!isAuthenticated) return
      setDontShowAgain(false)
      setCurrentStep(0)
      setIsOpen(true)
      setHasShownAfterLogin(true)
    }

    window.addEventListener(GUIDE_OPEN_EVENT, handleOpenGuide as EventListener)
    return () => window.removeEventListener(GUIDE_OPEN_EVENT, handleOpenGuide as EventListener)
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return
    if (typeof window === 'undefined') return

    let shouldForceOpen = false
    try {
      shouldForceOpen = window.localStorage.getItem(FORCE_OPEN_STORAGE_KEY) === '1'
      if (shouldForceOpen) {
        window.localStorage.removeItem(FORCE_OPEN_STORAGE_KEY)
      }
    } catch {
      shouldForceOpen = false
    }

    let hasSeenGuide = false
    let isDisabled = false
    try {
      hasSeenGuide = window.localStorage.getItem(seenStorageKey) === 'true'
      isDisabled = window.localStorage.getItem(disabledStorageKey) === 'true'
    } catch {
      hasSeenGuide = false
      isDisabled = false
    }

    if ((!hasSeenGuide && !isDisabled) || shouldForceOpen) {
      if (hasShownAfterLogin && !shouldForceOpen) {
        return
      }
      const timer = window.setTimeout(
        () => {
          setDontShowAgain(false)
          setCurrentStep(0)
          setIsOpen(true)
          setHasShownAfterLogin(true)
        },
        shouldForceOpen ? 150 : 1300
      )
      return () => window.clearTimeout(timer)
    }
  }, [isAuthenticated, user?.id, seenStorageKey, disabledStorageKey, hasShownAfterLogin])

  const persistGuideState = () => {
    try {
      window.localStorage.setItem(seenStorageKey, 'true')
      if (dontShowAgain) {
        window.localStorage.setItem(disabledStorageKey, 'true')
      } else {
        window.localStorage.removeItem(disabledStorageKey)
      }
    } catch {
      // Best effort only.
    }
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1)
      return
    }
    handleComplete()
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleComplete = (openCommandPalette: boolean = false) => {
    persistGuideState()
    setIsOpen(false)
    if (openCommandPalette) {
      onComplete?.({ openCommandPalette: true })
    }
  }

  const handleSkip = () => {
    persistGuideState()
    setIsOpen(false)
  }

  const step = steps[currentStep]
  const Icon = step.icon
  const isLastStep = currentStep === steps.length - 1

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog onClose={handleSkip} className="relative z-50" initialFocus={closeButtonRef}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/55 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto safe-area-inset p-4 md:p-6">
          <div className="flex min-h-full items-center justify-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="relative w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-800 sm:p-7 max-h-[calc(100dvh-2rem)] overflow-y-auto">
                <button
                  ref={closeButtonRef}
                  onClick={handleSkip}
                  className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                  aria-label="Close welcome guide"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>

                <div className="mb-6 flex items-center gap-4">
                  <div className="rounded-full bg-indigo-100 p-3 dark:bg-indigo-900/35">
                    <Icon className="h-7 w-7 text-indigo-600 dark:text-indigo-300" />
                  </div>
                  <div>
                    <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                      {step.title}
                    </Dialog.Title>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 sm:text-base">
                      {step.description}
                    </p>
                  </div>
                </div>

                {step.kind === 'workspace' && (
                  <div className="space-y-3">
                    {roleGuide.primaryFeatures.map((feature) => (
                      <div
                        key={feature.name}
                        className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/45"
                      >
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{feature.name}</p>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{feature.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {step.kind === 'workflow' && (
                  <ol className="space-y-3">
                    {roleGuide.workflow.map((line, index) => (
                      <li
                        key={`${index}-${line}`}
                        className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/45"
                      >
                        <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                          {index + 1}
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-200">{line}</span>
                      </li>
                    ))}
                  </ol>
                )}

                {step.kind === 'tips' && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-800 dark:bg-indigo-900/30">
                      <div className="flex items-center gap-2">
                        <CommandLineIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                        <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">Command Search</p>
                      </div>
                      <p className="mt-2 text-sm text-indigo-900 dark:text-indigo-100">{commandPaletteTip}</p>
                    </div>

                    {roleGuide.roleTips.map((tip, index) => (
                      <div
                        key={`${index}-${tip}`}
                        className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/45"
                      >
                        <div className="flex items-center gap-2">
                          {index % 2 === 0 ? (
                            <SparklesIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                          ) : (
                            <KeyIcon className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                          )}
                          <p className="text-sm text-gray-700 dark:text-gray-200">{tip}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 flex justify-center gap-2">
                  {steps.map((_, index) => (
                    <button
                      key={`step-${index}`}
                      onClick={() => setCurrentStep(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === currentStep
                          ? 'w-8 bg-indigo-600'
                          : index < currentStep
                            ? 'w-2 bg-indigo-300 dark:bg-indigo-500'
                            : 'w-2 bg-gray-300 dark:bg-gray-600'
                      }`}
                      aria-label={`Go to step ${index + 1}`}
                    />
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-center">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={dontShowAgain}
                      onChange={(e) => setDontShowAgain(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    Do not show this guide again
                  </label>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    onClick={handleSkip}
                    className="text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Skip for now
                  </button>

                  <div className="flex items-center gap-2 self-end">
                    {currentStep > 0 && (
                      <button
                        onClick={handlePrevious}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Previous
                      </button>
                    )}

                    {isLastStep && (
                      <button
                        onClick={() => handleComplete(true)}
                        className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-indigo-300 px-3 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
                      >
                        <CommandLineIcon className="h-4 w-4" />
                        Open Command Search
                      </button>
                    )}

                    <button
                      onClick={handleNext}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                    >
                      {isLastStep ? 'Finish' : 'Next'}
                      {!isLastStep && <ArrowRightIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
                  Step {currentStep + 1} of {steps.length}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default CommandPaletteOnboarding
