# Structure Reuse Guide

Admin and organizer guide for reusing contest structure without copying live operational state.

This guide covers:

- cloning contests
- cloning categories
- creating contests directly from event templates
- creating categories directly from saved category templates
- importing criteria into an existing category
- saving a category as a reusable template
- completing fresh assignment setup after cloning

## Audience

Intended roles:

- `SUPER_ADMIN`
- `ADMIN`
- `ORGANIZER`
- `BOARD`

These flows are for structure management. They do not replace the normal scoring, certification, or assignment workflows.

## What Gets Copied

### Contest clone

Contest clone copies the structural setup of a contest into another event.

Copied:

- contest name, unless you provide a new clone name
- description
- `contestantNumberingMode`
- contest visibility settings for contestants
- scoring type
- categories, if selected
- criteria, if selected

Reset on the clone:

- `nextContestantNumber` is reset to `1`
- archived/locked state
- winner publication state
- certification/approval state
- soft-delete state

Not copied:

- contestants
- judges
- tally master assignments
- auditor assignments
- scoped role assignments
- scores
- score comments
- certifications
- audit/governance records

### Category clone

Category clone copies the structural setup of a category into another contest.

Copied:

- category name, unless you provide a new clone name
- description
- `scoreCap`
- `timeLimit`
- `contestantMin`
- `contestantMax`
- criteria, if selected

Reset on the clone:

- totals certification state
- board approval state
- soft-delete state

Not copied:

- contestant assignments
- judge assignments
- tally master assignments
- auditor assignments
- scoped role assignments
- scores
- comments
- certifications

### Criteria import

Criteria import is append-only.

Sources:

- another category
- a saved category template

Behavior:

- imported criteria are added as new rows in the target category
- existing criteria in the target category are not deleted or replaced
- source criteria are never modified

If you need a clean replacement structure, use category clone into a fresh category and edit the clone.

## Template Reuse

### Save category as template

Use this when you want to reuse a scoring rubric across multiple categories without tying the future categories to a live source category.

The saved template contains:

- template name
- template description
- criterion names
- criterion max scores

It does not contain:

- contest/category assignments
- scores
- certifications

### When to use a template vs clone

Use a template when:

- you want a reusable rubric library
- you want to create a new category from a saved rubric
- you only need criteria or a rubric-first category setup

Use a clone when:

- you want a full editable copy of an existing contest or category
- you want to preserve structural settings, not just criteria
- you want a clean starting point for a new workflow

## UI Workflows

### Clone a contest

1. Open `Contests`.
2. Select `Clone` on the source contest.
3. Choose the target event.
4. Optionally rename the clone.
5. Choose whether to copy categories and criteria.
6. Create the clone.
7. In the post-clone wizard:
   - review the cloned contest
   - review cloned categories
   - open assignments for fresh operational setup
   - add scoped `BOARD`, `TALLY_MASTER`, or `AUDITOR` roles if needed

### Clone a category

1. Open `Categories`.
2. Select `Clone` on the source category.
3. Choose the target contest.
4. Optionally rename the clone.
5. Choose whether to copy criteria.
6. Create the clone.
7. Review the cloned category in edit mode.
8. Open assignments for fresh setup if needed.
9. Add scoped `BOARD`, `TALLY_MASTER`, or `AUDITOR` roles if needed.

### Import criteria into a category

1. Open the target category in edit mode.
2. In the `Criteria` section, select `Import`.
3. Choose `From Category` or `From Template`.
4. Select the source.
5. Import.
6. Review and edit the resulting criteria as needed.

### Create a contest from an event template

1. Open `Contests`.
2. Select `Create Contest`.
3. Switch to `From Template`.
4. Select the source event template.
5. Select the contest template within that event template.
6. Choose the target event and optionally adjust the generated name/description.
7. Create the contest.
8. In the post-create review flow:
   - review the created contest
   - review created categories and criteria
   - complete fresh assignments

Notes:

- categories and criteria linked to the selected template contest are deployed automatically
- assignments, scores, certifications, and publication state are not copied

### Create a category from a saved category template

1. Open `Categories`.
2. Select `Create Category`.
3. Switch to `From Template`.
4. Select the saved category template.
5. Choose the target contest and adjust the name/description or limits if needed.
6. Create the category.
7. Review the created category in edit mode and make any rubric changes needed.

Notes:

- saved category templates currently provide the template description and criteria
- `scoreCap`, `timeLimit`, `contestantMin`, and `contestantMax` are set from the creation form, not from the saved template

### Save a category as a template

1. Open `Categories`.
2. Select `Save Template` on the source category.
3. Provide the template name and optional description.
4. Save.

## Assignment Setup After Cloning

Cloning is intentionally separate from operational assignment creation.

After cloning, configure assignments fresh for the new contest or category:

- judges
- contestants
- tally masters
- auditors
- scoped `BOARD`
- scoped `TALLY_MASTER`
- scoped `AUDITOR`

Use:

- `Assignments` page for operational assignments
- embedded scoped role assignment panels in the clone review/edit flows for scoped role assignments

This separation avoids copying stale or invalid operational state into the clone.

## Guardrails and Expected Behavior

### Tenant isolation

Source and target must belong to the same tenant.

Cross-tenant copy is not supported.

### Editability

Clones are normal editable records after creation.

You can:

- rename the clone
- adjust copied settings
- add/remove/edit criteria
- assign users and contestants

You cannot mutate the source through clone/import operations.

### Criteria import semantics

Criteria import does not support destructive replace.

Reason:

- avoids removing live target criteria unexpectedly
- avoids breaking categories that may already have workflow context
- keeps import behavior easy to audit and explain

## API Summary

Primary endpoints:

- `POST /api/v1/contests/:id/clone`
- `POST /api/v1/categories/:id/clone`
- `POST /api/v1/categories/:id/criteria/import`
- `POST /api/v1/event-templates/:id/create-contest`
- `POST /api/v1/templates/:id/create-category`
- `POST /api/v1/templates/categories/from-category/:id`

Request highlights:

- contest clone requires `targetEventId`
- category clone requires `targetContestId`
- event-template contest deployment requires `templateContestId` and `targetEventId`
- category-template deployment requires `contestId`
- criteria import requires exactly one of:
  - `sourceCategoryId`
  - `templateId`

See `docs/04-API-REFERENCE.md` for the route summary and `docs/CONTEST-CATEGORY-TEMPLATE-COPY-PLAN.md` for implementation details.

## Recommended Operational Pattern

1. Use templates for stable reusable rubrics.
2. Use contest/category clone when you need a full editable copy.
3. Treat clones as draft-like working copies, but remember they are real records.
4. Complete assignments only after reviewing the cloned structure.
5. Do not use criteria import as a replacement mechanism for an already active category.

## Troubleshooting

### Clone failed with `404`

Usually means:

- source not found
- target event/contest not found
- source or target is outside the current tenant

### Clone failed with `403`

Usually means the signed-in user role does not have permission for the operation.

### Criteria import failed

Check:

- target category exists
- source category or template exists
- source and target are in the same tenant
- you selected exactly one source type

### Assignments look empty after cloning

This is expected. Assignments are not copied from the source.

## Related Documents

- `docs/03-FEATURES.md`
- `docs/04-API-REFERENCE.md`
- `docs/13-ADMIN-GUIDE.md`
- `docs/CONTEST-CATEGORY-TEMPLATE-COPY-PLAN.md`
