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
import { authenticateToken, requireRole } from '../middleware/auth'
import { logActivity } from '../middleware/errorHandler'

const router: Router = express.Router()

router.use(authenticateToken)

router.get('/review', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE']), getScoreReview)

router.get('/settings', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), getScoreGovernanceSettings)
router.put('/settings', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), logActivity('UPDATE_SCORE_GOVERNANCE_SETTINGS', 'SYSTEM_SETTING'), updateScoreGovernanceSettings)

router.post('/requests', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE']), logActivity('CREATE_SCORE_GOVERNANCE_REQUEST', 'SCORE_GOVERNANCE'), createScoreGovernanceRequest)
router.get('/requests', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE']), getScoreGovernanceRequests)
router.post('/requests/:id/approve', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR', 'TALLY_MASTER']), logActivity('APPROVE_SCORE_GOVERNANCE_REQUEST', 'SCORE_GOVERNANCE'), approveScoreGovernanceRequest)
router.post('/requests/:id/reject', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR', 'TALLY_MASTER']), logActivity('REJECT_SCORE_GOVERNANCE_REQUEST', 'SCORE_GOVERNANCE'), rejectScoreGovernanceRequest)

export default router

module.exports = router
