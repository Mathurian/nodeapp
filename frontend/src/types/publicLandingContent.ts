export type PublicLandingFeatureIcon =
  | 'calendar'
  | 'trophy'
  | 'chart'
  | 'shield'
  | 'users'
  | 'document'
  | 'sparkles'

export interface PublicLandingFeatureItem {
  icon: PublicLandingFeatureIcon
  title: string
  description: string
}

export interface PublicLandingAnnouncement {
  enabled: boolean
  text: string
  backgroundColor: string
  textColor: string
}

export interface PublicLandingHero {
  badge: string
  title: string
  highlight: string
  description: string
  invitationNote: string
  primaryCtaLabel: string
  primaryCtaUrl: string
  secondaryCtaLabel: string
  secondaryCtaUrl: string
}

export interface PublicLandingFeatureSection {
  enabled: boolean
  title: string
  subtitle: string
  items: PublicLandingFeatureItem[]
}

export interface PublicLandingCtaSection {
  enabled: boolean
  title: string
  description: string
  primaryCtaLabel: string
  primaryCtaUrl: string
  secondaryCtaLabel: string
  secondaryCtaUrl: string
}

export interface PublicLandingFooter {
  tagline: string
}

export interface PublicLandingContent {
  announcement: PublicLandingAnnouncement
  hero: PublicLandingHero
  featureSection: PublicLandingFeatureSection
  ctaSection: PublicLandingCtaSection
  footer: PublicLandingFooter
}

export const PUBLIC_LANDING_ICON_OPTIONS: Array<{
  value: PublicLandingFeatureIcon
  label: string
}> = [
  { value: 'calendar', label: 'Calendar' },
  { value: 'trophy', label: 'Trophy' },
  { value: 'chart', label: 'Chart' },
  { value: 'shield', label: 'Shield' },
  { value: 'users', label: 'Users' },
  { value: 'document', label: 'Document' },
  { value: 'sparkles', label: 'Sparkles' },
]

export const DEFAULT_PUBLIC_LANDING_CONTENT: PublicLandingContent = {
  announcement: {
    enabled: false,
    text: '',
    backgroundColor: '#FEF3C7',
    textColor: '#92400E',
  },
  hero: {
    badge: 'Event Management Simplified',
    title: 'Manage Events, Scoring &',
    highlight: 'Certifications',
    description:
      'Manage events, scoring, certifications, and reporting from one secure platform.',
    invitationNote: 'New accounts require an invitation from an organizer or admin.',
    primaryCtaLabel: 'Log In to Your Account',
    primaryCtaUrl: '/login',
    secondaryCtaLabel: '',
    secondaryCtaUrl: '',
  },
  featureSection: {
    enabled: true,
    title: 'Everything You Need to Run Successful Events',
    subtitle:
      'Structured tools for organizers, judges, auditors, and staff throughout the full event lifecycle.',
    items: [
      {
        icon: 'calendar',
        title: 'Manage Events',
        description: 'Create, organize, and coordinate event operations in one place.',
      },
      {
        icon: 'trophy',
        title: 'Score Competitions',
        description: 'Track judging, tallies, and result workflows with structured role access.',
      },
      {
        icon: 'shield',
        title: 'Certify Outcomes',
        description:
          'Handle review, certification, and publication workflows without spreadsheet drift.',
      },
    ],
  },
  ctaSection: {
    enabled: true,
    title: 'Need Access?',
    description: 'Contact your organizer or administrator for an invited account.',
    primaryCtaLabel: 'Sign In',
    primaryCtaUrl: '/login',
    secondaryCtaLabel: '',
    secondaryCtaUrl: '',
  },
  footer: {
    tagline: 'All access is tenant-managed and invitation-based.',
  },
}

const cloneFeatureItems = (items: PublicLandingFeatureItem[]) => items.map((item) => ({ ...item }))

export const clonePublicLandingContent = (): PublicLandingContent => ({
  announcement: { ...DEFAULT_PUBLIC_LANDING_CONTENT.announcement },
  hero: { ...DEFAULT_PUBLIC_LANDING_CONTENT.hero },
  featureSection: {
    ...DEFAULT_PUBLIC_LANDING_CONTENT.featureSection,
    items: cloneFeatureItems(DEFAULT_PUBLIC_LANDING_CONTENT.featureSection.items),
  },
  ctaSection: { ...DEFAULT_PUBLIC_LANDING_CONTENT.ctaSection },
  footer: { ...DEFAULT_PUBLIC_LANDING_CONTENT.footer },
})

const toText = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback

const toBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

const toHexColor = (value: unknown, fallback: string): string =>
  typeof value === 'string' && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim())
    ? value.trim()
    : fallback

const toIcon = (value: unknown, fallback: PublicLandingFeatureIcon): PublicLandingFeatureIcon => {
  if (typeof value !== 'string') return fallback
  return PUBLIC_LANDING_ICON_OPTIONS.some((option) => option.value === value)
    ? (value as PublicLandingFeatureIcon)
    : fallback
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

export const normalizePublicLandingContent = (value: unknown): PublicLandingContent => {
  const defaults = clonePublicLandingContent()
  const root = asRecord(value)
  const announcement = asRecord(root.announcement)
  const hero = asRecord(root.hero)
  const featureSection = asRecord(root.featureSection)
  const ctaSection = asRecord(root.ctaSection)
  const footer = asRecord(root.footer)
  const candidateItems = Array.isArray(featureSection.items) ? featureSection.items : []

  return {
    announcement: {
      enabled: toBoolean(announcement.enabled, defaults.announcement.enabled),
      text: toText(announcement.text, defaults.announcement.text),
      backgroundColor: toHexColor(
        announcement.backgroundColor,
        defaults.announcement.backgroundColor
      ),
      textColor: toHexColor(announcement.textColor, defaults.announcement.textColor),
    },
    hero: {
      badge: toText(hero.badge, defaults.hero.badge),
      title: toText(hero.title, defaults.hero.title),
      highlight: typeof hero.highlight === 'string' ? hero.highlight.trim() : defaults.hero.highlight,
      description: toText(hero.description, defaults.hero.description),
      invitationNote:
        typeof hero.invitationNote === 'string'
          ? hero.invitationNote.trim()
          : defaults.hero.invitationNote,
      primaryCtaLabel: toText(hero.primaryCtaLabel, defaults.hero.primaryCtaLabel),
      primaryCtaUrl: toText(hero.primaryCtaUrl, defaults.hero.primaryCtaUrl),
      secondaryCtaLabel:
        typeof hero.secondaryCtaLabel === 'string' ? hero.secondaryCtaLabel.trim() : '',
      secondaryCtaUrl: typeof hero.secondaryCtaUrl === 'string' ? hero.secondaryCtaUrl.trim() : '',
    },
    featureSection: {
      enabled: toBoolean(featureSection.enabled, defaults.featureSection.enabled),
      title: toText(featureSection.title, defaults.featureSection.title),
      subtitle: toText(featureSection.subtitle, defaults.featureSection.subtitle),
      items: defaults.featureSection.items.map((item, index) => {
        const candidate = asRecord(candidateItems[index])
        return {
          icon: toIcon(candidate.icon, item.icon),
          title: toText(candidate.title, item.title),
          description: toText(candidate.description, item.description),
        }
      }),
    },
    ctaSection: {
      enabled: toBoolean(ctaSection.enabled, defaults.ctaSection.enabled),
      title: toText(ctaSection.title, defaults.ctaSection.title),
      description: toText(ctaSection.description, defaults.ctaSection.description),
      primaryCtaLabel: toText(ctaSection.primaryCtaLabel, defaults.ctaSection.primaryCtaLabel),
      primaryCtaUrl: toText(ctaSection.primaryCtaUrl, defaults.ctaSection.primaryCtaUrl),
      secondaryCtaLabel:
        typeof ctaSection.secondaryCtaLabel === 'string'
          ? ctaSection.secondaryCtaLabel.trim()
          : '',
      secondaryCtaUrl:
        typeof ctaSection.secondaryCtaUrl === 'string' ? ctaSection.secondaryCtaUrl.trim() : '',
    },
    footer: {
      tagline: toText(footer.tagline, defaults.footer.tagline),
    },
  }
}
