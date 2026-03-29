export type PublicLandingFeatureIcon =
  | 'calendar'
  | 'trophy'
  | 'chart'
  | 'shield'
  | 'users'
  | 'document'
  | 'sparkles';

export interface PublicLandingFeatureItem {
  icon: PublicLandingFeatureIcon;
  title: string;
  description: string;
}

export interface PublicLandingAnnouncement {
  enabled: boolean;
  text: string;
  backgroundColor: string;
  textColor: string;
}

export interface PublicLandingHero {
  badge: string;
  title: string;
  highlight: string;
  description: string;
  invitationNote: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
}

export interface PublicLandingFeatureSection {
  enabled: boolean;
  title: string;
  subtitle: string;
  items: PublicLandingFeatureItem[];
}

export interface PublicLandingCtaSection {
  enabled: boolean;
  title: string;
  description: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
}

export interface PublicLandingFooter {
  tagline: string;
}

export interface PublicLandingContent {
  announcement: PublicLandingAnnouncement;
  hero: PublicLandingHero;
  featureSection: PublicLandingFeatureSection;
  ctaSection: PublicLandingCtaSection;
  footer: PublicLandingFooter;
}

export const PUBLIC_LANDING_CONTENT_SETTING_KEY = 'public_landing_content';

const ALLOWED_ICONS = new Set<PublicLandingFeatureIcon>([
  'calendar',
  'trophy',
  'chart',
  'shield',
  'users',
  'document',
  'sparkles',
]);

const DEFAULT_FEATURE_ITEMS: PublicLandingFeatureItem[] = [
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
    description: 'Handle review, certification, and publication workflows without spreadsheet drift.',
  },
];

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
    items: DEFAULT_FEATURE_ITEMS,
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
};

const cloneDefaultContent = (): PublicLandingContent => ({
  announcement: { ...DEFAULT_PUBLIC_LANDING_CONTENT.announcement },
  hero: { ...DEFAULT_PUBLIC_LANDING_CONTENT.hero },
  featureSection: {
    ...DEFAULT_PUBLIC_LANDING_CONTENT.featureSection,
    items: DEFAULT_PUBLIC_LANDING_CONTENT.featureSection.items.map((item) => ({ ...item })),
  },
  ctaSection: { ...DEFAULT_PUBLIC_LANDING_CONTENT.ctaSection },
  footer: { ...DEFAULT_PUBLIC_LANDING_CONTENT.footer },
});

const normalizeText = (value: unknown, fallback: string, maxLength: number): string => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) return fallback;
  return normalized.slice(0, maxLength);
};

const normalizeOptionalText = (value: unknown, maxLength: number): string => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
};

const normalizeHexColor = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized) ? normalized : fallback;
};

const normalizeBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return fallback;
};

const normalizeIcon = (value: unknown, fallback: PublicLandingFeatureIcon): PublicLandingFeatureIcon => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase() as PublicLandingFeatureIcon;
  return ALLOWED_ICONS.has(normalized) ? normalized : fallback;
};

const normalizeUrl = (value: unknown, fallback = ''): string => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  if (!normalized) return '';
  if (normalized.startsWith('/')) return normalized;
  if (/^https:\/\//i.test(normalized)) return normalized;
  if (/^mailto:/i.test(normalized)) return normalized;
  if (/^tel:/i.test(normalized)) return normalized;
  return fallback;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

export const normalizePublicLandingContent = (input: unknown): PublicLandingContent => {
  const defaults = cloneDefaultContent();
  const root = asRecord(input);
  const announcement = asRecord(root['announcement']);
  const hero = asRecord(root['hero']);
  const featureSection = asRecord(root['featureSection']);
  const ctaSection = asRecord(root['ctaSection']);
  const footer = asRecord(root['footer']);
  const candidateItems = Array.isArray(featureSection['items']) ? featureSection['items'] : [];

  return {
    announcement: {
      enabled: normalizeBoolean(announcement['enabled'], defaults.announcement.enabled),
      text: normalizeOptionalText(announcement['text'], 180),
      backgroundColor: normalizeHexColor(
        announcement['backgroundColor'],
        defaults.announcement.backgroundColor
      ),
      textColor: normalizeHexColor(
        announcement['textColor'],
        defaults.announcement.textColor
      ),
    },
    hero: {
      badge: normalizeText(hero['badge'], defaults.hero.badge, 80),
      title: normalizeText(hero['title'], defaults.hero.title, 120),
      highlight: normalizeOptionalText(hero['highlight'], 80),
      description: normalizeText(hero['description'], defaults.hero.description, 280),
      invitationNote: normalizeOptionalText(hero['invitationNote'], 180),
      primaryCtaLabel: normalizeText(
        hero['primaryCtaLabel'],
        defaults.hero.primaryCtaLabel,
        60
      ),
      primaryCtaUrl: normalizeUrl(hero['primaryCtaUrl'], defaults.hero.primaryCtaUrl),
      secondaryCtaLabel: normalizeOptionalText(hero['secondaryCtaLabel'], 60),
      secondaryCtaUrl: normalizeUrl(hero['secondaryCtaUrl']),
    },
    featureSection: {
      enabled: normalizeBoolean(featureSection['enabled'], defaults.featureSection.enabled),
      title: normalizeText(featureSection['title'], defaults.featureSection.title, 100),
      subtitle: normalizeText(featureSection['subtitle'], defaults.featureSection.subtitle, 220),
      items: defaults.featureSection.items.map((item, index) => {
        const candidate = asRecord(candidateItems[index]);
        return {
          icon: normalizeIcon(candidate['icon'], item.icon),
          title: normalizeText(candidate['title'], item.title, 60),
          description: normalizeText(candidate['description'], item.description, 180),
        };
      }),
    },
    ctaSection: {
      enabled: normalizeBoolean(ctaSection['enabled'], defaults.ctaSection.enabled),
      title: normalizeText(ctaSection['title'], defaults.ctaSection.title, 100),
      description: normalizeText(
        ctaSection['description'],
        defaults.ctaSection.description,
        220
      ),
      primaryCtaLabel: normalizeText(
        ctaSection['primaryCtaLabel'],
        defaults.ctaSection.primaryCtaLabel,
        60
      ),
      primaryCtaUrl: normalizeUrl(
        ctaSection['primaryCtaUrl'],
        defaults.ctaSection.primaryCtaUrl
      ),
      secondaryCtaLabel: normalizeOptionalText(ctaSection['secondaryCtaLabel'], 60),
      secondaryCtaUrl: normalizeUrl(ctaSection['secondaryCtaUrl']),
    },
    footer: {
      tagline: normalizeText(footer['tagline'], defaults.footer.tagline, 160),
    },
  };
};

export const parsePublicLandingContentSetting = (
  rawValue: string | null | undefined
): PublicLandingContent => {
  if (!rawValue) return cloneDefaultContent();

  try {
    return normalizePublicLandingContent(JSON.parse(rawValue));
  } catch {
    return cloneDefaultContent();
  }
};

export const serializePublicLandingContent = (value: unknown): string =>
  JSON.stringify(normalizePublicLandingContent(value));
