import express, { Router } from 'express';
import {
  createScoreDelegationGrant,
  getEligibleDelegatedJudges,
  listScoreDelegationGrants,
  revokeScoreDelegationGrant,
  validateScoreDelegationGrant,
} from '../controllers/scoreDelegationController';
import { authenticateToken, requireAnyPermission, requirePermission, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

router.use(authenticateToken);

router.get(
  '/',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE', 'DELEGATE']),
  requirePermission('score-delegations:read'),
  listScoreDelegationGrants,
);

router.get(
  '/eligible-judges',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE', 'DELEGATE']),
  requireAnyPermission(['score-delegations:read', 'delegated-scores:read', 'delegated-scores:write']),
  getEligibleDelegatedJudges,
);

router.post(
  '/validate',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE', 'DELEGATE']),
  requireAnyPermission(['score-delegations:read', 'delegated-scores:read', 'delegated-scores:write']),
  validateScoreDelegationGrant,
);

router.post(
  '/',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']),
  requirePermission('score-delegations:write'),
  logActivity('CREATE_SCORE_DELEGATION_GRANT', 'SCORE_DELEGATION'),
  createScoreDelegationGrant,
);

router.post(
  '/:id/revoke',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']),
  requirePermission('score-delegations:revoke'),
  logActivity('REVOKE_SCORE_DELEGATION_GRANT', 'SCORE_DELEGATION'),
  revokeScoreDelegationGrant,
);

export default router;

module.exports = router;
