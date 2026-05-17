import { UserRole } from '@prisma/client';

export type DocsSectionId =
  | 'public-help'
  | 'admin-guides'
  | 'technical-reference'
  | 'security-runtime';

export interface DocsSectionDefinition {
  id: DocsSectionId;
  title: string;
  order: number;
}

export interface PublishedDocPolicy {
  path: string;
  title: string;
  description: string;
  sectionId: DocsSectionId;
  sectionTitle: string;
  sectionOrder: number;
  order: number;
  requiredRoles?: UserRole[];
}

const DOCS_SECTIONS: DocsSectionDefinition[] = [
  { id: 'public-help', title: 'Public Help', order: 10 },
  { id: 'admin-guides', title: 'Admin & Operator Guides', order: 20 },
  { id: 'technical-reference', title: 'Technical Reference', order: 30 },
  { id: 'security-runtime', title: 'Security, Deployment & Recovery', order: 40 },
];

const SECTION_BY_ID = new Map(DOCS_SECTIONS.map((section) => [section.id, section]));

const buildPolicy = (
  path: string,
  sectionId: DocsSectionId,
  order: number,
  title: string,
  description: string,
  requiredRoles?: UserRole[],
): PublishedDocPolicy => {
  const section = SECTION_BY_ID.get(sectionId);
  if (!section) {
    throw new Error(`Unknown docs section: ${sectionId}`);
  }

  return {
    path,
    title,
    description,
    sectionId,
    sectionTitle: section.title,
    sectionOrder: section.order,
    order,
    requiredRoles,
  };
};

export const PUBLISHED_DOCS_POLICY: PublishedDocPolicy[] = [
  buildPolicy(
    '01-ARCHITECTURE.md',
    'technical-reference',
    10,
    'System Architecture',
    'Overview of the application architecture',
    ['ADMIN', 'SUPER_ADMIN'],
  ),
  buildPolicy(
    '02-GETTING-STARTED.md',
    'public-help',
    10,
    'Getting Started',
    'Sign in, understand your role, install the app on mobile, and find the right help',
  ),
  buildPolicy(
    '03-FEATURES.md',
    'admin-guides',
    10,
    'Features Overview',
    'Feature and role overview for authenticated admins and operators',
    ['ADMIN', 'SUPER_ADMIN'],
  ),
  buildPolicy(
    '04-API-REFERENCE.md',
    'technical-reference',
    10,
    'API Reference',
    'Complete API documentation',
    ['ADMIN', 'SUPER_ADMIN'],
  ),
  buildPolicy(
    '05-DATABASE.md',
    'technical-reference',
    20,
    'Database Schema',
    'Database structure and relationships',
    ['ADMIN', 'SUPER_ADMIN'],
  ),
  buildPolicy(
    '06-FRONTEND.md',
    'technical-reference',
    30,
    'Frontend Guide',
    'Frontend architecture and development',
    ['ADMIN', 'SUPER_ADMIN'],
  ),
  buildPolicy(
    '07-SECURITY.md',
    'security-runtime',
    10,
    'Security Guide',
    'Security features and best practices',
    ['ADMIN', 'SUPER_ADMIN'],
  ),
  buildPolicy(
    '08-DEPLOYMENT.md',
    'security-runtime',
    20,
    'Deployment Guide',
    'Production deployment instructions',
    ['ADMIN', 'SUPER_ADMIN'],
  ),
  buildPolicy(
    '09-DEVELOPMENT.md',
    'technical-reference',
    50,
    'Development Setup',
    'Local development environment setup',
    ['ADMIN', 'SUPER_ADMIN'],
  ),
  buildPolicy(
    '10-TROUBLESHOOTING.md',
    'public-help',
    20,
    'Troubleshooting',
    'Common sign-in, scoring, results, browser, and support questions',
  ),
  buildPolicy(
    '11-DISASTER-RECOVERY.md',
    'security-runtime',
    30,
    'Disaster Recovery',
    'Backup and restore procedures',
    ['ADMIN', 'SUPER_ADMIN'],
  ),
  buildPolicy(
    '12-WORKFLOW-CUSTOMIZATION.md',
    'admin-guides',
    20,
    'Workflow Customization',
    'Workflow configuration and customization guidance',
    ['ADMIN', 'SUPER_ADMIN'],
  ),
  buildPolicy(
    '13-ADMIN-GUIDE.md',
    'admin-guides',
    30,
    'Admin Guide',
    'System administration and monitoring',
    ['ADMIN', 'SUPER_ADMIN'],
  ),
  buildPolicy(
    '14-ADVANCED-FEATURES.md',
    'admin-guides',
    40,
    'Advanced Features',
    'Feature flags, webhooks, custom fields, and other advanced capabilities',
    ['ADMIN', 'SUPER_ADMIN'],
  ),
  buildPolicy(
    '15-SCORING-CERTIFICATION-WORKFLOWS.md',
    'public-help',
    30,
    'Scoring and Certification Workflows',
    'Step-by-step scoring, delegated scoring, delegated certification, tally, auditor, and final approval workflows',
  ),
  buildPolicy(
    '16-DELEGATED-SCORING-ADMIN-OPERATOR-SETUP.md',
    'admin-guides',
    50,
    'Delegated Scoring Admin and Operator Setup',
    'Permissions, grants, delegate-certification controls, and audit expectations for delegated scoring fallback',
    ['ORGANIZER', 'ADMIN', 'SUPER_ADMIN'],
  ),
];

const DOC_POLICY_BY_PATH = new Map(
  PUBLISHED_DOCS_POLICY.map((policy) => [policy.path.toLowerCase(), policy]),
);

export const normalizeDocPolicyPath = (rawPath: string): string => {
  const normalized = String(rawPath || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .trim();

  if (!normalized) {
    return '';
  }

  return normalized.toLowerCase().endsWith('.md') ? normalized : `${normalized}.md`;
};

export const getPublishedDocPolicy = (rawPath: string): PublishedDocPolicy | null => {
  const normalized = normalizeDocPolicyPath(rawPath);
  return DOC_POLICY_BY_PATH.get(normalized.toLowerCase()) ?? null;
};

export const isPublishedDocPath = (rawPath: string): boolean =>
  getPublishedDocPolicy(rawPath) !== null;

export const canAccessPublishedDoc = (
  rawPath: string,
  role?: string | null,
): boolean => {
  const policy = getPublishedDocPolicy(rawPath);
  if (!policy) {
    return false;
  }

  if (!policy.requiredRoles || policy.requiredRoles.length === 0) {
    return true;
  }

  if (!role) {
    return false;
  }

  const normalizedRole = String(role).trim().toUpperCase();
  return policy.requiredRoles.includes(normalizedRole as UserRole);
};

export const getPublishedDocsSections = (): DocsSectionDefinition[] => [...DOCS_SECTIONS];
