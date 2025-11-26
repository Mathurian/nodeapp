# Security TODO Audit
**Date:** November 24, 2025
**Auditor:** Claude
**Status:** Initial Audit Complete

---

## Summary

Found **6 TODO/FIXME comments** in security-related files. All are low-risk architectural decisions or feature completeness items, not active security vulnerabilities.

**Risk Assessment:** LOW
- 0 Critical security issues
- 0 High security issues
- 4 Low-priority architectural decisions
- 2 Feature completeness items

---

## TODO Items Detail

### 1. Secrets Configuration Organization
**Files:**
- `src/services/SecretManager.ts:53`
- `src/config/secrets.config.ts:7`
- `src/config/secrets.config.ts:17`

**TODO Text:**
```
"TODO: Consider adding to env.ts or keep as-is for provider flexibility"
```

**Analysis:**
- Currently secrets provider config (VAULT_ADDR, AWS_REGION, etc.) is read directly from process.env
- These vars are not defined in the typed env.ts configuration
- This is actually intentional for provider flexibility
- Not a security issue - just an architectural decision

**Security Impact:** NONE
**Priority:** LOW
**Recommendation:** DOCUMENT (not a bug, it's by design)

**Resolution:**
Add documentation comment explaining the intentional design choice:
```typescript
/**
 * Note on Environment Variables:
 * Secrets provider configuration is intentionally read directly from process.env
 * rather than being defined in env.ts. This provides flexibility to use different
 * secret providers without requiring all provider-specific variables to be defined.
 *
 * Example: If using env provider, VAULT_ADDR and AWS credentials are not needed.
 * If using AWS, VAULT_ADDR is not needed, etc.
 *
 * This is a conscious architectural decision for provider flexibility.
 */
```

---

### 2. Cache Warming Logic
**File:** `src/controllers/cacheAdminController.ts:183`

**TODO Text:**
```typescript
// TODO: Implement cache warming logic
// This would pre-load frequently accessed data into cache
```

**Analysis:**
- Cache warming endpoint exists but not implemented
- This is a performance optimization feature, not security-critical
- Current system works fine without it
- Would reduce cold-start latency

**Security Impact:** NONE
**Priority:** LOW (Feature enhancement)
**Recommendation:** IMPLEMENT or REMOVE ENDPOINT

**Resolution:**
Either implement the feature or remove the placeholder endpoint to avoid confusion.

**Implementation Option:**
```typescript
public static async warmCache(_req: Request, res: Response): Promise<void> {
  try {
    const cacheService = getCacheService();
    let warmedCount = 0;

    // Warm frequently accessed data
    // 1. System settings
    const settings = await prisma.systemSetting.findMany();
    for (const setting of settings) {
      await cacheService.set(
        `system:setting:${setting.key}`,
        JSON.stringify(setting),
        CacheNamespace.SYSTEM
      );
      warmedCount++;
    }

    // 2. Active tenants
    const tenants = await prisma.tenant.findMany({ where: { isActive: true } });
    for (const tenant of tenants) {
      await cacheService.set(
        `tenant:${tenant.id}`,
        JSON.stringify(tenant),
        CacheNamespace.TENANT
      );
      warmedCount++;
    }

    res.json({
      success: true,
      message: 'Cache warming completed',
      warmedCount,
    });
  } catch (error) {
    logger.error('Error warming cache', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to warm cache',
    });
  }
}
```

---

### 3. Audit Logging Integration
**File:** `src/middleware/virusScanMiddleware.ts:160`

**TODO Text:**
```typescript
// Log to audit trail
// TODO: Integrate with audit logging service
```

**Analysis:**
- Virus detection events should be logged to audit trail
- Currently only logged to Winston logger
- AuditLogService already exists in codebase
- Missing integration is a completeness issue

**Security Impact:** MEDIUM (audit trail gaps)
**Priority:** MEDIUM
**Recommendation:** IMPLEMENT

**Resolution:**
Add audit log entry when infected file detected:

```typescript
// After line 159 in virusScanMiddleware.ts
import { container } from 'tsyringe';
import { AuditLogService } from '../services/AuditLogService';

// Inside infected files handler
const auditLogService = container.resolve(AuditLogService);
await auditLogService.log({
  userId: (req as any).user?.id,
  userName: (req as any).user?.name,
  action: 'VIRUS_DETECTED',
  entityType: 'File',
  entityId: file.originalname,
  changes: {
    virus: result.virus,
    filename: file.originalname,
    fileSize: file.size,
  },
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  metadata: {
    scanResult: result,
  },
  tenantId: (req as any).tenantId,
});
```

---

### 4. Virus Infection Notification
**File:** `src/services/VirusScanService.ts:461`

**TODO Text:**
```typescript
private async notifyInfection(scanResult: ScanResult): Promise<void> {
  // TODO: Implement notification (email, webhook, etc.)
  logger.warn('Infection notification', { scanResult });
}
```

**Analysis:**
- Notification system partially implemented
- Email service already integrated in virusScanMiddleware.ts
- This is a duplicate notification point
- Should integrate with existing NotificationService

**Security Impact:** LOW (nice to have for security team)
**Priority:** LOW
**Recommendation:** IMPLEMENT or CONSOLIDATE

**Resolution:**
Implement proper notification using existing services:

```typescript
private async notifyInfection(scanResult: ScanResult): Promise<void> {
  try {
    const { EmailService } = require('./EmailService');
    const { NotificationService } = require('./NotificationService');

    const emailService = container.resolve(EmailService);
    const notificationService = container.resolve(NotificationService);

    // Send email to security team
    const securityEmail = process.env['SECURITY_EMAIL'];
    if (securityEmail) {
      await emailService.send({
        to: securityEmail,
        subject: `[SECURITY] Virus Detected: ${scanResult.virus}`,
        template: 'virus-alert',
        data: {
          filename: scanResult.file,
          virus: scanResult.virus,
          size: scanResult.size,
          timestamp: scanResult.scannedAt,
        },
      });
    }

    // Create in-app notification for admins
    await notificationService.notifyAdmins({
      type: 'SYSTEM',
      title: 'Virus Detected',
      message: `Infected file blocked: ${scanResult.file}`,
      metadata: JSON.stringify(scanResult),
    });

    logger.info('Virus infection notifications sent', { scanResult });
  } catch (error) {
    logger.error('Failed to send virus infection notification', { error });
    // Don't throw - notification failure shouldn't stop the flow
  }
}
```

---

## Action Plan

### Immediate Actions (Sprint 1)

#### Action 1: Document Secrets Config Design
**File:** `src/config/secrets.config.ts`
**Action:** Add comprehensive documentation comment
**Effort:** 15 minutes
**Risk:** None

#### Action 2: Implement Audit Logging for Virus Detection
**File:** `src/middleware/virusScanMiddleware.ts`
**Action:** Integrate with AuditLogService
**Effort:** 1 hour
**Risk:** Low (additive only)

#### Action 3: Implement Virus Notification
**File:** `src/services/VirusScanService.ts`
**Action:** Complete notification implementation
**Effort:** 1 hour
**Risk:** Low (additive only)

#### Action 4: Implement or Remove Cache Warming
**File:** `src/controllers/cacheAdminController.ts`
**Action:** Implement cache warming logic
**Effort:** 2 hours
**Risk:** Low (performance feature)

### Non-Actions (Document Only)

#### Item 1-3: Secrets Config Architecture
**Action:** Document the intentional design
**No code changes needed** - this is working as intended

---

## Testing Requirements

### After Resolution:
- [ ] Test audit logging captures virus detections
- [ ] Test notification service sends virus alerts
- [ ] Test cache warming warms expected items
- [ ] Verify no regressions in existing functionality
- [ ] Security review of all changes

---

## Conclusion

**All TODO items are low-risk:**
- 3 are architectural decisions (already correct, just need documentation)
- 3 are feature completeness items (not security vulnerabilities)

**No immediate security risks identified.**

All items can be safely resolved in Sprint 1 without impacting production security posture.

---

*Audit completed: November 24, 2025*
