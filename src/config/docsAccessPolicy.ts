import { UserRole } from '@prisma/client';

export type DocsSectionId =
  | 'getting-started'
  | 'technical-reference'
  | 'security-deployment'
  | 'operations'
  | 'administration-advanced';

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
  { id: 'getting-started', title: 'Getting Started', order: 10 },
  { id: 'technical-reference', title: 'Technical Reference', order: 20 },
  { id: 'security-deployment', title: 'Security & Deployment', order: 30 },
  { id: 'operations', title: 'Operations', order: 40 },
  { id: 'administration-advanced', title: 'Administration & Advanced', order: 50 },
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
    'getting-started',
    10,
    'System Architecture',
    'Overview of the application architecture',
  ),
  buildPolicy(
    '02-GETTING-STARTED.md',
    'getting-started',
    20,
    'Getting Started',
    'Quick start guide for new users',
  ),
  buildPolicy(
    '03-FEATURES.md',
    'getting-started',
    30,
    'Features Overview',
    'Comprehensive overview of all features',
  ),
  buildPolicy(
    '04-API-REFERENCE.md',
    'technical-reference',
    10,
    'API Reference',
    'Complete API documentation',
  ),
  buildPolicy(
    '05-DATABASE.md',
    'technical-reference',
    20,
    'Database Schema',
    'Database structure and relationships',
  ),
  buildPolicy(
    '06-FRONTEND.md',
    'technical-reference',
    30,
    'Frontend Guide',
    'Frontend architecture and development',
  ),
  buildPolicy(
    '07-SECURITY.md',
    'security-deployment',
    10,
    'Security Guide',
    'Security features and best practices',
  ),
  buildPolicy(
    '08-DEPLOYMENT.md',
    'security-deployment',
    20,
    'Deployment Guide',
    'Production deployment instructions',
    ['ADMIN', 'SUPER_ADMIN'],
  ),
  buildPolicy(
    '09-DEVELOPMENT.md',
    'security-deployment',
    30,
    'Development Setup',
    'Local development environment setup',
    ['ADMIN', 'SUPER_ADMIN'],
  ),
  buildPolicy(
    '10-TROUBLESHOOTING.md',
    'operations',
    10,
    'Troubleshooting',
    'Common issues and solutions',
  ),
  buildPolicy(
    '11-DISASTER-RECOVERY.md',
    'operations',
    20,
    'Disaster Recovery',
    'Backup and restore procedures',
    ['ADMIN', 'SUPER_ADMIN'],
  ),
  buildPolicy(
    '12-WORKFLOW-CUSTOMIZATION.md',
    'administration-advanced',
    10,
    'Workflow Customization',
    'Workflow configuration and customization guidance',
    ['ADMIN', 'SUPER_ADMIN'],
  ),
  buildPolicy(
    '13-ADMIN-GUIDE.md',
    'administration-advanced',
    20,
    'Admin Guide',
    'System administration and monitoring',
    ['ADMIN', 'SUPER_ADMIN'],
  ),
  buildPolicy(
    '14-ADVANCED-FEATURES.md',
    'administration-advanced',
    30,
    'Advanced Features',
    'Feature flags, webhooks, custom fields, and other advanced capabilities',
    ['ADMIN', 'SUPER_ADMIN'],
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
