import { UserRole } from '@prisma/client';

export interface PublishedResultsVisibilitySettings {
  detailedResultsRoles: UserRole[];
  winnersRoles: UserRole[];
  progressRoles: UserRole[];
}

export interface EventPublishedResultsOverrides {
  resultsVisibleRolesOverride?: string | null;
  winnersVisibleRolesOverride?: string | null;
  progressVisibleRolesOverride?: string | null;
  hideResultsUntilEventPublished?: boolean | null;
}

export const PUBLISHED_RESULTS_VISIBILITY_SETTING_KEYS = {
  detailedResultsRoles: 'published_results_visibility_detailedResultsRoles',
  winnersRoles: 'published_results_visibility_winnersRoles',
  progressRoles: 'published_results_visibility_progressRoles',
} as const;

export const DEFAULT_PUBLISHED_RESULTS_VISIBILITY: PublishedResultsVisibilitySettings = {
  detailedResultsRoles: [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.ORGANIZER,
    UserRole.BOARD,
    UserRole.TALLY_MASTER,
    UserRole.AUDITOR,
    UserRole.JUDGE,
    UserRole.EMCEE,
  ],
  winnersRoles: [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.ORGANIZER,
    UserRole.BOARD,
    UserRole.TALLY_MASTER,
    UserRole.AUDITOR,
    UserRole.EMCEE,
  ],
  progressRoles: [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.ORGANIZER,
    UserRole.BOARD,
    UserRole.TALLY_MASTER,
    UserRole.AUDITOR,
    UserRole.EMCEE,
  ],
};

export const PUBLISHED_RESULTS_BYPASS_ROLES = new Set<UserRole>([
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.ORGANIZER,
  UserRole.BOARD,
  UserRole.TALLY_MASTER,
  UserRole.AUDITOR,
]);

const USER_ROLE_VALUES = new Set<string>(Object.values(UserRole));

export const parseVisibilityRoles = (
  rawValue: string | null | undefined,
  fallback: UserRole[]
): UserRole[] => {
  if (!rawValue || !rawValue.trim()) {
    return [...fallback];
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [...fallback];
    }

    const roles = parsed
      .map((value) => String(value || '').trim().toUpperCase())
      .filter((value): value is UserRole => USER_ROLE_VALUES.has(value));

    return Array.from(new Set<UserRole>(roles));
  } catch {
    return [...fallback];
  }
};

export const serializeVisibilityRoles = (roles: Array<string | UserRole>): string => {
  const normalized = Array.from(
    new Set(
      roles
        .map((value) => String(value || '').trim().toUpperCase())
        .filter((value): value is UserRole => USER_ROLE_VALUES.has(value))
    )
  );

  return JSON.stringify(normalized);
};

export const resolveVisibilityRoles = (
  overrideValue: string | null | undefined,
  fallback: UserRole[]
): UserRole[] => parseVisibilityRoles(overrideValue, fallback);

export const isRoleVisible = (roles: UserRole[], role: string | UserRole): boolean =>
  roles.includes(String(role || '').trim().toUpperCase() as UserRole);
