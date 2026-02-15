# E2E Lifecycle Track

Purpose: validate full contest lifecycle from setup through winners and final artifacts.

Supported modes:
- `PRESEEDED_TENANT`
- `EMPTY_TENANT`

## Mode A: PRESEEDED_TENANT

Use when event/contest/category/assignments already exist.

Required checks:
1. Fetch IDs using `GET /api/v1/test-runner/uat-ids`.
2. Validate role assignments and scoring scope.
3. Run full scoring and certification chain:
   - Judge -> Tally -> Auditor -> Board/Organizer.
4. Validate results:
   - contest-level ordering
   - category drill-down detail.
5. Validate winner controls:
   - pre-publish visibility
   - post-publish visibility.
6. Validate artifacts:
   - bio files/images
   - commentary files
   - generated reports.

## Mode B: EMPTY_TENANT

Use when tenant starts with no usable event setup.

Required bootstrap:
1. Create event.
2. Create at least one contest.
3. Create at least two categories.
4. Create criteria for scoring.
5. Create/import contestants.
6. Assign judge, tally master, auditor, board/organizer users.

Then execute the same full chain as `PRESEEDED_TENANT`.

## Case Mapping

- `TC-LIFE-001`: empty-tenant bootstrap entities
- `TC-LIFE-002`: empty-tenant assignment setup
- `TC-LIFE-003`: judge scoring completion
- `TC-LIFE-004`: certification chain completion
- `TC-LIFE-005`: results integrity after certification
- `TC-LIFE-006`: winners control and publish/unlock behavior
- `TC-LIFE-007`: role-visibility enforcement after release flags
- `TC-LIFE-008`: final-state file/report artifact validation

## Pass Criteria

Track passes only when:
- all `TC-LIFE-*` cases pass for selected mode
- no role sees out-of-scope data
- no blocking runtime/server errors occur in lifecycle flow
