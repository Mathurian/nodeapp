# Contest, Category, and Criteria Copy Plan

## Purpose

Implement additive copy/template features for contests, categories, and criteria without changing existing scoring, certification, assignment, or reporting behavior.

This plan turns the approved product decisions into an execution-ready implementation spec.

## Approved Product Decisions

1. Contest clones copy contest-level setup fields and remain fully editable after creation.
2. Category clones copy structural fields including `scoreCap` and remain fully editable after creation.
3. Source structures are never destructively changed during clone/import operations.
4. Contestant/judge/role/tally/auditor assignments are not copied from the source, but the cloned target should support full assignment setup during the post-clone edit flow.
5. Contest clone UX should use a guided wizard after clone creation.
6. Category clone UX should redirect to a normal edit view with assignment/setup sections.

## Current System Facts

### Structure Models

- Contest structure lives in `Contest` at `prisma/schema.prisma:80`.
- Category structure lives in `Category` at `prisma/schema.prisma:129`.
- Criteria live in `Criterion` at `prisma/schema.prisma:253`.
- Existing category-template support lives in `CategoryTemplate` and `TemplateCriterion` at `prisma/schema.prisma:586`.
- Existing event-template support lives in `EventTemplate` at `prisma/schema.prisma:1230`.

### Contestant Numbering

- The contestant number is stored on `Contestant.contestantNumber` at `prisma/schema.prisma:191`.
- Contest-level numbering policy and auto-increment state live on:
  - `Contest.contestantNumberingMode`
  - `Contest.nextContestantNumber`
- Auto-indexed numbering is controlled by `src/services/contestantNumberingService.ts:1`.

Implication:

- clone the contest numbering mode
- reset the cloned contest's `nextContestantNumber` to `1`

### Assignment Surface

Assignments are spread across multiple models and APIs:

- judge assignment workflow: `Assignment` at `prisma/schema.prisma:699`
- contestant links: `ContestContestant` and `CategoryContestant` at `prisma/schema.prisma:640`, `prisma/schema.prisma:670`
- judge links: `ContestJudge` and `CategoryJudge` at `prisma/schema.prisma:655`, `prisma/schema.prisma:685`
- scoped role assignments: `RoleAssignment` at `prisma/schema.prisma:1530`
- tally assignments: `TallyMasterAssignment` at `prisma/schema.prisma:2005`
- auditor assignments: `AuditorAssignment` at `prisma/schema.prisma:2030`

Implication:

- source assignment records should not be copied
- post-clone setup must create fresh target-side assignments through existing APIs or a thin orchestration layer

## Goals

1. Clone a category into another contest.
2. Clone a contest into another event.
3. Save an existing category as a reusable category template.
4. Import criteria into a category from another category or a category template.
5. Hand the user directly into a safe edit/setup flow for the clone.

## Non-Goals

1. Copy scores, deductions, comments, certifications, files, or audit history.
2. Copy source assignments automatically.
3. Introduce draft tables, temporary clone state, or alternate edit models.
4. Add destructive criteria synchronization to existing scored categories in MVP.

## UX Model

### Contest Clone

1. User starts clone from a contest action.
2. User selects target event and optional new name.
3. System creates the clone immediately.
4. User is redirected into a guided post-clone setup wizard for:
   - contest details review
   - category/criteria review
   - assignments setup

### Category Clone

1. User starts clone from a category action.
2. User selects target contest and optional new name.
3. System creates the clone immediately.
4. User is redirected to the cloned category edit view with:
   - category details
   - criteria editing
   - assignment/setup sections

### Criteria Import

MVP behavior is `append` only.

Reason:

- it is non-destructive
- it cannot silently break existing scored categories
- it keeps clone/import semantics aligned with “edit the clone, not the source”

If a user wants a clean criteria set, the supported path is:

1. clone the category
2. edit the cloned criteria/category normally

## Copy Rules

### Contest Clone Copies

- `name`
- `description`
- `contestantNumberingMode`
- `scoringType`
- `contestantViewRestricted`
- `contestantViewReleaseDate`
- any other contest-level setup fields that do not represent operational state

### Contest Clone Resets

- `id`
- `createdAt`
- `updatedAt`
- `nextContestantNumber` -> `1`
- `archived`
- `isLocked`
- `lockedAt`
- `lockVerifiedBy`
- `winnersPublished`
- `publishedAt`
- `publishedBy`
- `deletedAt`
- `deletedBy`

### Category Clone Copies

- `name`
- `description`
- `scoreCap`
- `timeLimit`
- `contestantMin`
- `contestantMax`

### Category Clone Resets

- `id`
- `createdAt`
- `updatedAt`
- `totalsCertified`
- `boardApproved`
- `approvedAt`
- `approvedBy`
- `deletedAt`
- `deletedBy`

### Criterion Clone Copies

- `name`
- `maxScore`

### Never Copy

- scores
- score comments
- deductions
- certifications
- assignments
- governance requests
- files
- notification state
- delete/archive/lock history

## API Plan

### 1. Clone Category

`POST /api/categories/:id/clone`

Request:

```json
{
  "targetContestId": "cuid",
  "name": "Optional clone name",
  "includeCriteria": true
}
```

Response:

```json
{
  "id": "newCategoryId",
  "contestId": "targetContestId",
  "copiedCriteriaCount": 4
}
```

### 2. Clone Contest

`POST /api/contests/:id/clone`

Request:

```json
{
  "targetEventId": "cuid",
  "name": "Optional clone name",
  "includeCategories": true,
  "includeCriteria": true
}
```

Response:

```json
{
  "id": "newContestId",
  "eventId": "targetEventId",
  "copiedCategoriesCount": 3,
  "copiedCriteriaCount": 12
}
```

### 3. Save Category as Template

`POST /api/templates/categories/from-category/:id`

Request:

```json
{
  "name": "Template name",
  "description": "Optional description"
}
```

### 4. Import Criteria Into Category

`POST /api/categories/:id/criteria/import`

Request from category:

```json
{
  "sourceCategoryId": "cuid"
}
```

Request from template:

```json
{
  "templateId": "cuid"
}
```

Rules:

- exactly one of `sourceCategoryId` or `templateId`
- append only in MVP

## Backend Design

### New Service

Add `src/services/StructureCopyService.ts`.

Responsibilities:

1. validate tenant ownership for source and destination
2. load source structure with required child records
3. create clone/import records transactionally
4. apply copy/reset rules
5. return summary metadata for UI handoff
6. invalidate affected contest/category caches

### Expected Public Methods

```ts
cloneCategory(input)
cloneContest(input)
importCriteriaAppend(input)
createCategoryTemplateFromCategory(input)
```

### Controller and Route Work

Update or add:

- `src/controllers/categoriesController.ts`
- `src/routes/categoriesRoutes.ts`
- `src/controllers/contestsController.ts`
- `src/routes/contestsRoutes.ts`
- `src/controllers/templatesController.ts`
- `src/routes/templatesRoutes.ts`

### Validation Work

Add request schemas in `src/middleware/validation.ts`:

- `cloneCategorySchema`
- `cloneContestSchema`
- `importCriteriaSchema`
- `createTemplateFromCategorySchema`

Validation requirements:

1. all IDs must be CUIDs
2. exactly one import source for criteria import
3. booleans default cleanly
4. target IDs required for clone operations

### Template Route Normalization

Before feature work, normalize category-template routes so the route surface matches the implemented controller capabilities.

This should happen in:

- `src/routes/templatesRoutes.ts`
- `src/controllers/templatesController.ts`

## Frontend Design

### Contest Clone Flow

Add contest action:

- `Clone Contest`

Flow:

1. modal collects target event and clone name
2. clone request is submitted
3. on success, redirect to cloned contest
4. open/setup wizard state for:
   - contest details
   - categories review
   - assignments

Assignment wizard should support creating fresh target-side:

- contestant contest/category links
- judge assignments
- contest/category judge links
- tally master assignments
- auditor assignments
- role assignments

### Category Clone Flow

Add category actions:

- `Clone Category`
- `Import Criteria`
- `Save as Template`

Flow:

1. modal collects target contest and clone name
2. clone request is submitted
3. on success, redirect to cloned category edit view
4. show normal editable criteria and assignment sections

### Frontend Files Likely To Change

- `frontend/src/services/api.ts`
- relevant contest/category management pages in `frontend/src/pages/`
- `frontend/src/pages/TemplatesPage.tsx`
- any category template management page already wired to `/api/templates`

## Assignment Strategy

### Principle

Do not clone assignment rows from the source.

### MVP Delivery Choice

Use post-clone setup against the newly created target records.

Recommended implementation path:

1. frontend wizard/tabs call existing assignment endpoints directly
2. do not make assignment creation part of the structure clone transaction

Why:

- assignments are operational state, not structure
- current assignment APIs are fragmented across assignment types
- this keeps structure clone low-risk

### Optional Follow-Up

If the fragmented API surface makes the UI too complex, add a new backend orchestration endpoint later:

`POST /api/clone-setups/contest/:id/assignments`

That is not required for MVP.

## Execution Phases

### Phase 0: Route and Template Surface Cleanup

Deliverables:

1. normalize category-template routes
2. confirm API naming conventions for new clone/import endpoints

### Phase 1: Service Foundation

Deliverables:

1. add `StructureCopyService`
2. implement tenant-safe source/destination loading
3. implement shared cache invalidation helpers

### Phase 2: Category Clone

Deliverables:

1. endpoint
2. controller wiring
3. transactional category clone
4. optional criteria copy

### Phase 3: Contest Clone

Deliverables:

1. endpoint
2. controller wiring
3. transactional contest clone
4. nested category clone
5. nested criteria clone
6. reset `nextContestantNumber` to `1`

### Phase 4: Save Category as Template

Deliverables:

1. endpoint
2. service method
3. category + criteria to template conversion

### Phase 5: Criteria Import

Deliverables:

1. append-only criteria import endpoint
2. import from source category
3. import from category template

### Phase 6: Frontend Clone/Edit Flows

Deliverables:

1. contest clone modal
2. contest post-clone wizard
3. category clone modal
4. category post-clone edit handoff
5. save-as-template action
6. import-criteria action

### Phase 7: Assignment Setup UX

Deliverables:

1. contest wizard assignment step
2. category edit assignment sections
3. support all assignment types through existing APIs

## Testing Plan

### Unit Tests

Add service-level tests for:

1. clone category with criteria
2. clone category without criteria
3. clone contest with categories and criteria
4. clone contest without child structures
5. contest clone resets `nextContestantNumber`
6. contest clone preserves `contestantNumberingMode`
7. import criteria from category
8. import criteria from template
9. save category as template
10. reject cross-tenant source/destination combinations

### Integration Tests

Add API coverage for:

1. `POST /api/categories/:id/clone`
2. `POST /api/contests/:id/clone`
3. `POST /api/categories/:id/criteria/import`
4. `POST /api/templates/categories/from-category/:id`

Assertions:

1. source data is unchanged
2. no scores are copied
3. no certifications are copied
4. no assignments are copied
5. cloned category/contest can be edited with existing endpoints
6. imported criteria behave like normal criteria records

### Manual QA

Validate:

1. clone contest into a different event
2. clone category into a different contest
3. edit cloned names and copied settings
4. import criteria from template into category
5. save category as template and reuse it
6. complete all assignment types during post-clone setup
7. verify source contest/category remains unchanged

## Rollout Plan

1. ship backend clone/template APIs first
2. add integration coverage
3. ship frontend clone and setup flows
4. document new admin/organizer workflows
5. optionally add a feature flag if staged exposure is required

## Implementation Notes

### Assumptions

1. contest visibility/restriction settings are considered structural setup and should be copied
2. clone names default to `"(Copy)"` when a user does not provide one
3. assignment setup remains outside the clone transaction

### Guardrails

1. same-tenant only
2. transaction per clone/import action
3. additive endpoints only
4. no source mutation during clone/import
5. no destructive criteria replacement in MVP

## Recommended Build Order

1. normalize template routes
2. add `StructureCopyService`
3. implement category clone
4. implement contest clone
5. implement category-to-template
6. implement append-only criteria import
7. implement contest wizard and category edit handoff
8. add assignment setup UX
9. finalize docs and tests
