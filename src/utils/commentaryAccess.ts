import { Prisma, ScoreFile, UserRole } from '@prisma/client';
import { AuthenticatedRequestUser } from '../types/express';

const PRIVILEGED_COMMENTARY_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'ORGANIZER',
  'BOARD',
  'TALLY_MASTER',
  'AUDITOR',
];

const NO_ACCESS_SENTINEL = '__no_commentary_access__';

export interface CommentaryViewerContext {
  id: string;
  role: UserRole;
  tenantId: string;
  judgeId: string | null;
  contestantId: string | null;
}

export function getViewerJudgeId(user?: Partial<AuthenticatedRequestUser> | null): string | null {
  return user?.judgeId || user?.judge?.id || null;
}

export function getViewerContestantId(user?: Partial<AuthenticatedRequestUser> | null): string | null {
  return user?.contestantId || user?.contestant?.id || null;
}

export function createCommentaryViewerContext(user: AuthenticatedRequestUser): CommentaryViewerContext {
  return {
    id: user.id,
    role: user.role,
    tenantId: user.tenantId,
    judgeId: getViewerJudgeId(user),
    contestantId: getViewerContestantId(user),
  };
}

export function isPrivilegedCommentaryRole(role?: string | null): boolean {
  return PRIVILEGED_COMMENTARY_ROLES.includes((role || '') as UserRole);
}

export function buildCommentaryReadWhere(
  viewer: CommentaryViewerContext,
): Prisma.ScoreCommentWhereInput {
  if (isPrivilegedCommentaryRole(viewer.role)) {
    return {};
  }

  if (viewer.role === 'JUDGE' && viewer.judgeId) {
    return { judgeId: viewer.judgeId };
  }

  if (viewer.role === 'CONTESTANT' && viewer.contestantId) {
    return { contestantId: viewer.contestantId };
  }

  return { id: NO_ACCESS_SENTINEL };
}

export function buildJudgeCommentReadWhere(
  viewer: CommentaryViewerContext,
): Prisma.JudgeCommentWhereInput {
  if (isPrivilegedCommentaryRole(viewer.role)) {
    return {};
  }

  if (viewer.role === 'JUDGE' && viewer.judgeId) {
    return { judgeId: viewer.judgeId };
  }

  return { id: NO_ACCESS_SENTINEL };
}

export function buildScoreFileReadWhere(
  viewer: CommentaryViewerContext,
): Prisma.ScoreFileWhereInput {
  if (isPrivilegedCommentaryRole(viewer.role)) {
    return {};
  }

  if (viewer.role === 'JUDGE') {
    return { uploadedById: viewer.id };
  }

  if (viewer.role === 'CONTESTANT' && viewer.contestantId) {
    return { contestantId: viewer.contestantId };
  }

  return { id: NO_ACCESS_SENTINEL };
}

export function canViewScoreFile(
  viewer: CommentaryViewerContext,
  file: Pick<ScoreFile, 'uploadedById' | 'contestantId'>,
): boolean {
  if (isPrivilegedCommentaryRole(viewer.role)) {
    return true;
  }

  if (viewer.role === 'JUDGE') {
    return file.uploadedById === viewer.id;
  }

  if (viewer.role === 'CONTESTANT') {
    return Boolean(viewer.contestantId && file.contestantId === viewer.contestantId);
  }

  return false;
}
