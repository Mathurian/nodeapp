import express, { Router } from 'express'
import {
  approveScoreGovernanceRequest,
  createScoreGovernanceRequest,
  getScoreGovernanceRequests,
  getScoreGovernanceSettings,
  getScoreReview,
  rejectScoreGovernanceRequest,
  updateScoreGovernanceSettings
} from '../controllers/scoreGovernanceController'
import { authenticateToken, requirePermission, requireRole } from '../middleware/auth'
import { logActivity } from '../middleware/errorHandler'

const router: Router = express.Router()
const requireScoreGovernanceRead = requirePermission('score-governance:read')
const requireScoreGovernanceRequest = requirePermission('score-governance:request')
const requireScoreGovernanceApprove = requirePermission('score-governance:approve')
const requireScoreGovernanceReject = requirePermission('score-governance:reject')
const requireScoreGovernanceConfigure = requirePermission('score-governance:configure')

router.use(authenticateToken)

router.get('/review', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE']), requireScoreGovernanceRead, getScoreReview)

router.get('/settings', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), requireScoreGovernanceConfigure, getScoreGovernanceSettings)
router.put('/settings', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), requireScoreGovernanceConfigure, logActivity('UPDATE_SCORE_GOVERNANCE_SETTINGS', 'SYSTEM_SETTING'), updateScoreGovernanceSettings)

router.post('/requests', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE']), requireScoreGovernanceRequest, logActivity('CREATE_SCORE_GOVERNANCE_REQUEST', 'SCORE_GOVERNANCE'), createScoreGovernanceRequest)
router.get('/requests', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE']), requireScoreGovernanceRead, getScoreGovernanceRequests)
router.post('/requests/:id/approve', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR', 'TALLY_MASTER']), requireScoreGovernanceApprove, logActivity('APPROVE_SCORE_GOVERNANCE_REQUEST', 'SCORE_GOVERNANCE'), approveScoreGovernanceRequest)
router.post('/requests/:id/reject', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR', 'TALLY_MASTER']), requireScoreGovernanceReject, logActivity('REJECT_SCORE_GOVERNANCE_REQUEST', 'SCORE_GOVERNANCE'), rejectScoreGovernanceRequest)

export default router

module.exports = router
