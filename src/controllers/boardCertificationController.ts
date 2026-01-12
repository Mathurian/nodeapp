/**
 * Board Certification Controller
 * Handles API requests for Stage 4 (Board) certification workflow
 */

import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { BoardCertificationService } from '../services/BoardCertificationService';

const boardCertService = container.resolve(BoardCertificationService);

/**
 * GET /api/board/category/:categoryId/certification/status
 * Get Board certification status for a category
 */
export const getBoardCertificationStatus = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!categoryId) {
      return res.status(400).json({ error: 'Category ID is required' });
    }

    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID not found in request' });
    }

    const status = await boardCertService.getBoardCertificationStatus(categoryId, tenantId);
    return res.json({ success: true, data: status });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to get Board certification status',
    });
  }
};

/**
 * POST /api/board/category/:categoryId/certification/submit
 * Submit Board certification (final approval)
 */
export const submitBoardCertification = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const { signatureName, comments } = req.body;
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;

    if (!categoryId) {
      return res.status(400).json({ error: 'Category ID is required' });
    }

    if (!userId || !tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const certification = await boardCertService.submitBoardCertification(
      categoryId,
      userId,
      tenantId,
      signatureName,
      comments
    );

    return res.json({
      success: true,
      message: 'Board certification submitted successfully',
      data: certification,
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to submit Board certification',
    });
  }
};

/**
 * GET /api/board/pending-approvals
 * Get all categories pending Board approval
 */
export const getPendingBoardApprovals = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID not found in request' });
    }

    const categories = await boardCertService.getPendingBoardApprovals(tenantId);

    return res.json({
      success: true,
      data: categories,
      count: categories.length,
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to get pending Board approvals',
    });
  }
};

/**
 * GET /api/board/approved-categories
 * Get all Board-approved categories
 */
export const getApprovedCategories = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID not found in request' });
    }

    const categories = await boardCertService.getApprovedCategories(tenantId);

    return res.json({
      success: true,
      data: categories,
      count: categories.length,
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to get approved categories',
    });
  }
};

/**
 * DELETE /api/board/category/:categoryId/certification/revoke
 * Revoke Board certification (admin only)
 */
export const revokeBoardCertification = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;

    if (!categoryId) {
      return res.status(400).json({ error: 'Category ID is required' });
    }

    if (!userId || !tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required for revocation' });
    }

    await boardCertService.revokeBoardCertification(categoryId, userId, tenantId, reason);

    return res.json({
      success: true,
      message: 'Board certification revoked successfully',
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to revoke Board certification',
    });
  }
};
