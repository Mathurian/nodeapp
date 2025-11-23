# Prisma Schema Multi-Tenancy Implementation Plan

## Overview
**Status**: Planning Phase
**Total Models**: 78
**Models with tenantId**: 21
**Models requiring tenantId**: ~50-55 (after excluding global models)

## Objectives
1. Add `tenantId` field to all tenant-specific models
2. Add appropriate indexes for tenant isolation
3. Update services to enforce tenant context
4. Create and test database migrations
5. Ensure complete tenant data isolation

## Model Categorization

### ✅ Already Has tenantId (21 models)
1. Tenant
2. Event
3. Contest
4. Category
5. Contestant
6. Judge
7. User
8. Assignment
9. Certification
10. Notification
11. Report
12. AuditLog
13. BackupLog
14. BackupSchedule (optional)
15. BackupTarget (optional)
16. DrConfig (optional)
17. DrMetric (optional)
18. DrTestLog (optional)
19. EventLog (optional)
20. WorkflowInstance
21. WebhookConfig

### 🔴 Needs tenantId - High Priority (Core Data)
1. **Criterion** - Category criteria (inherits from Category)
2. **Score** - Judge scores (inherits from Category/Contest/Judge)
3. **JudgeComment** - Judge comments (inherits from Category/Contestant/Judge)
4. **JudgeCertification** - Judge certifications (inherits from Category/Judge)
5. **OverallDeduction** - Contestant deductions (inherits from Category/Contestant)
6. **EmceeScript** - Event/Contest/Category scripts
7. **ArchivedEvent** - Archived events
8. **JudgeScoreRemovalRequest** - Score removal requests (inherits from Category/Judge)
9. **ContestContestant** - Contest-contestant assignments
10. **ContestJudge** - Contest-judge assignments
11. **CategoryContestant** - Category-contestant assignments
12. **CategoryJudge** - Category-judge assignments
13. **CategoryCertification** - Category certifications
14. **ContestCertification** - Contest certifications
15. **DeductionApproval** - Deduction approvals
16. **DeductionRequest** - Deduction requests
17. **File** - Uploaded files (event/contest/category related)
18. **JudgeContestantCertification** - Judge-contestant certifications
19. **JudgeUncertificationRequest** - Judge uncertification requests
20. **WinnerSignature** - Winner signatures
21. **WorkflowTemplate** (already optional)
22. **WorkflowStepExecution** - Inherits from WorkflowInstance
23. **WorkflowStep** - Inherits from WorkflowTemplate
24. **WorkflowTransition** - Workflow transitions

### 🟡 Needs tenantId - Medium Priority (Supporting Data)
1. **CategoryTemplate** - Category templates
2. **TemplateCriterion** - Template criteria
3. **CustomFieldValue** - Custom field values
4. **CustomField** - Custom field definitions
5. **EmailTemplate** - Email templates (event-specific or global)
6. **EventTemplate** - Event templates
7. **NotificationDigest** - User notification digests
8. **NotificationPreference** - User notification preferences
9. **NotificationTemplate** - Notification templates (per-tenant)
10. **ReportInstance** - Generated reports
11. **ReportTemplate** - Report templates
12. **ReviewContestantCertification** - Review certifications
13. **ReviewJudgeScoreCertification** - Judge score review certifications
14. **RoleAssignment** - User role assignments
15. **SavedSearch** - User saved searches
16. **ScoreComment** - Score comments
17. **ScoreFile** - Score file uploads
18. **ScoreRemovalRequest** - Score removal requests
19. **SearchHistory** - User search history
20. **ThemeSetting** - Per-tenant themes
21. **WebhookDelivery** - Inherits from WebhookConfig

### 🟢 Global Models (No tenantId needed - 13 models)
1. **ActivityLog** - Global activity logging (cross-tenant)
2. **SystemSetting** - Global system settings
3. **BackupSetting** - Global backup settings
4. **CategoryType** - Shared category types
5. **EmailSetting** - Global email configuration
6. **EmailLog** - Global email logs (for auditing)
7. **LoggingSetting** - Global logging settings
8. **PasswordPolicy** - Global password policies
9. **PerformanceLog** - Global performance monitoring
10. **SearchAnalytic** - Global search analytics
11. **SecuritySetting** - Global security settings
12. **UserFieldConfiguration** - Global user field config

## Implementation Phases

### Phase 1: Core Data Models (24 models)
**Priority**: Critical
**Estimated Time**: 1-2 days

Models:
- Criterion
- Score
- JudgeComment
- JudgeCertification
- OverallDeduction
- EmceeScript
- ArchivedEvent
- JudgeScoreRemovalRequest
- ContestContestant
- ContestJudge
- CategoryContestant
- CategoryJudge
- CategoryCertification
- ContestCertification
- DeductionApproval
- DeductionRequest
- File
- JudgeContestantCertification
- JudgeUncertificationRequest
- WinnerSignature
- WorkflowStepExecution
- WorkflowStep
- WorkflowTransition

Changes needed:
1. Add `tenantId String` field
2. Add `@@index([tenantId])` for all
3. Add composite indexes where appropriate (e.g., `@@index([tenantId, categoryId])`)
4. Update unique constraints to include tenantId where necessary

### Phase 2: Supporting Data Models (21 models)
**Priority**: High
**Estimated Time**: 1-2 days

Models:
- CategoryTemplate
- TemplateCriterion
- CustomFieldValue
- CustomField
- EmailTemplate
- EventTemplate
- NotificationDigest
- NotificationPreference
- NotificationTemplate
- ReportInstance
- ReportTemplate
- ReviewContestantCertification
- ReviewJudgeScoreCertification
- RoleAssignment
- SavedSearch
- ScoreComment
- ScoreFile
- ScoreRemovalRequest
- SearchHistory
- ThemeSetting
- WebhookDelivery

### Phase 3: Service Layer Updates
**Priority**: Critical
**Estimated Time**: 2-3 days

Services requiring updates (13+ services):
1. **CriterionService** - Add tenantId context
2. **ScoreService** - Add tenantId context
3. **JudgeCommentService** - Add tenantId context
4. **DeductionService** - Add tenantId context (already has some)
5. **FileService** - Add tenantId context
6. **EmailService** - Add tenantId context for templates
7. **NotificationService** - Add tenantId context
8. **ReportService** - Add tenantId context
9. **SearchService** - Add tenantId context (already has some)
10. **WorkflowService** - Add tenantId context
11. **WebhookService** - Add tenantId context
12. **CustomFieldService** - Add tenantId context
13. **TemplateService** - Add tenantId context

Changes needed:
- Add tenant validation in all create/update/delete operations
- Add tenant filtering in all read operations
- Update repository layer to enforce tenant context
- Add tenant context to dependency injection

### Phase 4: Migration Generation
**Priority**: Critical
**Estimated Time**: 1 day

Steps:
1. Generate Prisma migration: `npx prisma migrate dev --name add-multi-tenancy`
2. Review generated SQL
3. Test migration on development database
4. Document rollback procedures

### Phase 5: Testing
**Priority**: Critical
**Estimated Time**: 2-3 days

Test scenarios:
1. Tenant isolation - ensure queries don't leak data
2. Cross-tenant operations - verify blocking
3. Migration testing - up and down migrations
4. Service layer testing - verify tenant context enforcement
5. API endpoint testing - verify tenant headers
6. Performance testing - verify index effectiveness

## Database Migration Strategy

### Migration Steps
```sql
-- Phase 1: Add tenantId columns (nullable first)
ALTER TABLE criteria ADD COLUMN "tenantId" TEXT;
ALTER TABLE scores ADD COLUMN "tenantId" TEXT;
... (for each model)

-- Phase 2: Populate tenantId from parent relationships
UPDATE criteria SET "tenantId" = (
  SELECT "tenantId" FROM categories WHERE categories.id = criteria."categoryId"
);

-- Phase 3: Make tenantId NOT NULL
ALTER TABLE criteria ALTER COLUMN "tenantId" SET NOT NULL;

-- Phase 4: Add indexes
CREATE INDEX "criteria_tenantId_idx" ON "criteria"("tenantId");
CREATE INDEX "scores_tenantId_idx" ON "scores"("tenantId");
... (for each model)

-- Phase 5: Add composite indexes
CREATE INDEX "scores_tenantId_categoryId_idx" ON "scores"("tenantId", "categoryId");
... (for each model with relationships)
```

### Rollback Strategy
- Keep nullable tenantId columns for 1 sprint
- Allow gradual rollout
- Maintain backward compatibility during transition

## Service Update Pattern

### Before (Without Tenant Context)
```typescript
async getScores(categoryId: string) {
  return this.prisma.score.findMany({
    where: { categoryId }
  });
}
```

### After (With Tenant Context)
```typescript
async getScores(categoryId: string, tenantId: string) {
  return this.prisma.score.findMany({
    where: {
      categoryId,
      tenantId
    }
  });
}
```

## Risk Assessment

### High Risks
1. **Data Migration Failures** - Orphaned records without parent tenantId
   - Mitigation: Comprehensive data validation before migration
2. **Service Breaking Changes** - APIs requiring tenantId parameter
   - Mitigation: Extract tenantId from user context, not parameters
3. **Performance Degradation** - Additional filtering overhead
   - Mitigation: Proper indexing strategy

### Medium Risks
1. **Junction Table Complexity** - Many-to-many relationships
   - Mitigation: Derive tenantId from either side of relationship
2. **Template Sharing** - Some templates might need to be global
   - Mitigation: Support both tenant-specific and global templates

## Success Criteria

✅ Phase 1 Complete:
- [ ] All 24 core models have tenantId
- [ ] All indexes created
- [ ] Migration tested and validated

✅ Phase 2 Complete:
- [ ] All 21 supporting models have tenantId
- [ ] All indexes created
- [ ] Migration tested and validated

✅ Phase 3 Complete:
- [ ] All 13+ services updated with tenant context
- [ ] Tenant validation enforced
- [ ] All tests passing

✅ Phase 4 Complete:
- [ ] Migration successfully applied to development
- [ ] Migration successfully applied to staging
- [ ] Rollback tested

✅ Phase 5 Complete:
- [ ] All test scenarios pass
- [ ] Performance benchmarks met
- [ ] Documentation updated

## Timeline

- **Day 1-2**: Phase 1 - Core Data Models (schema changes)
- **Day 3-4**: Phase 2 - Supporting Data Models (schema changes)
- **Day 5-6**: Migration generation and testing
- **Day 7-9**: Phase 3 - Service Layer Updates
- **Day 10-12**: Phase 5 - Comprehensive Testing
- **Day 13-14**: Documentation and deployment prep

**Total Estimated Time**: 13-14 working days (2.5-3 weeks)

## Next Steps

1. ✅ Review and approve this plan
2. Begin Phase 1: Update schema for core data models
3. Generate and review migrations
4. Update service layer
5. Comprehensive testing
6. Deploy to staging
7. Deploy to production

---

**Document Version**: 1.0
**Created**: 2025-11-17
**Last Updated**: 2025-11-17
