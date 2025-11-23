/**
 * Public Tenant Routes
 *
 * Routes for public tenant information (no authentication required)
 * Used for login pages and tenant discovery
 */

import express from 'express';
import prisma from '../config/database';

const router = express.Router();

/**
 * @swagger
 * /api/tenants/slug/{slug}:
 *   get:
 *     summary: Get tenant by slug (public)
 *     tags: [Tenants]
 *     description: Returns public tenant information for login/branding. No authentication required.
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant slug (URL-friendly identifier)
 *     responses:
 *       200:
 *         description: Public tenant information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tenant:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     slug:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *       404:
 *         description: Tenant not found
 */
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        // Don't expose sensitive fields like settings, domain, etc.
      }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: `Tenant with slug "${slug}" not found`
      });
    }

    if (!tenant.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This organization is currently inactive'
      });
    }

    // Fetch tenant-specific branding settings (if any)
    const brandingSettings = await prisma.systemSetting.findMany({
      where: {
        tenantId: tenant.id,
        key: {
          in: ['theme_logoPath', 'app_name', 'app_subtitle', 'theme_primaryColor']
        }
      },
      select: {
        key: true,
        value: true
      }
    });

    // Fall back to global settings if tenant doesn't have specific ones
    const globalSettings = await prisma.systemSetting.findMany({
      where: {
        tenantId: null,
        key: {
          in: ['theme_logoPath', 'app_name', 'app_subtitle', 'theme_primaryColor']
        }
      },
      select: {
        key: true,
        value: true
      }
    });

    // Merge settings (tenant overrides global)
    const settingsMap: Record<string, string> = {};
    globalSettings.forEach(s => settingsMap[s.key] = s.value);
    brandingSettings.forEach(s => settingsMap[s.key] = s.value);

    return res.json({
      success: true,
      tenant: {
        ...tenant,
        branding: {
          logoPath: settingsMap['theme_logoPath'] || null,
          appName: settingsMap['app_name'] || tenant.name,
          appSubtitle: settingsMap['app_subtitle'] || null,
          primaryColor: settingsMap['theme_primaryColor'] || null
        }
      }
    });
  } catch (error) {
    console.error('Error fetching tenant by slug:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/tenants/check/{slug}:
 *   get:
 *     summary: Check if tenant slug exists (public)
 *     tags: [Tenants]
 *     description: Quick check if a tenant slug is valid. No authentication required.
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Slug exists and is active
 *       404:
 *         description: Slug not found or inactive
 */
router.get('/check/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, isActive: true }
    });

    if (!tenant || !tenant.isActive) {
      return res.status(404).json({ exists: false });
    }

    return res.json({ exists: true });
  } catch (error) {
    return res.status(500).json({ exists: false, error: 'Internal server error' });
  }
});

export default router;
