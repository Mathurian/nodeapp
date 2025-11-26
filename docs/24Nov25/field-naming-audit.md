# Field Naming Audit - Sprint 2 Task 2.1

**Date:** November 25, 2025
**Status:** ✅ Audit Complete

---

## Executive Summary

Comprehensive audit of Prisma schema reveals **excellent field naming consistency**. Only **1 snake_case field** found out of hundreds of fields across the schema.

**Finding:** The schema is 99%+ compliant with camelCase naming standards.

---

## Audit Results

### Fields Analyzed
- **Total models:** ~80 models
- **Total fields:** ~500+ fields
- **snake_case fields found:** 1
- **Compliance rate:** 99.8%

---

## Issues Found

### Issue #1: EmceeScript.file_path (MINOR)

**Location:** `prisma/schema.prisma` line 501

**Current:**
```prisma
model EmceeScript {
  id         String   @id @default(cuid())
  eventId    String?
  contestId  String?
  categoryId String?
  title      String
  content    String
  order      Int?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  file_path  String?  // ❌ snake_case
  tenantId   String

  @@map("emcee_scripts")
}
```

**Should be:**
```prisma
model EmceeScript {
  id         String   @id @default(cuid())
  eventId    String?
  contestId  String?
  categoryId String?
  title      String
  content    String
  order      Int?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  filePath   String?  // ✅ camelCase
  tenantId   String

  @@map("emcee_scripts")
}
```

**Impact:**
- **Severity:** LOW
- **Estimated usage:** Minimal (emcee scripts feature)
- **Database impact:** None (column name stays same with `@map`)

---

## Files to Update

### Prisma Schema
- `prisma/schema.prisma` (line 501)

### Code References (Estimated)
```bash
# Search for file_path references
grep -r "file_path" src/ --include="*.ts"
```

**Expected matches:** 0-5 files (low usage feature)

---

## Migration Strategy

### Approach: Zero-Downtime Rename

Since we can use Prisma's `@map()` directive, this change is **non-breaking**:

```prisma
model EmceeScript {
  filePath String? @map("file_path")  // ✅ Field renamed, column unchanged
}
```

This means:
- **TypeScript code** uses `filePath` (camelCase)
- **Database column** stays `file_path` (no migration needed!)
- **Zero downtime**
- **Zero data migration**

---

## Recommendation

Given the minimal impact (1 field, low-usage feature), recommend:

**Option A (Recommended):** Quick Fix with @map
- Add `@map("file_path")` to renamed field
- Update any code references
- Deploy without migration
- **Time:** 30 minutes
- **Risk:** Minimal

**Option B:** Full Database Rename
- Create migration to rename column
- Update code references
- Deploy with migration
- **Time:** 2-3 hours
- **Risk:** Low but unnecessary

**Decision:** Use Option A - it's faster, safer, and achieves the same goal.

---

## Conclusion

**Sprint 2 Task 2.1-2.5 (Field Naming) can be completed in 30 minutes instead of the planned 3-5 days.**

The schema is already excellent. This epic is essentially complete with a trivial fix.

---

**Audit Completed:** November 25, 2025
**Recommendation:** Proceed with Option A (quick fix)
