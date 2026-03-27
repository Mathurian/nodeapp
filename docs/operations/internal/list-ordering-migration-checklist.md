# List Ordering Migration Checklist (Internal)

**Status:** Draft  
**Companion doc:** `docs/operations/internal/list-ordering-contract.md`

Use this checklist to implement the ordering contract consistently across backend and frontend.

---

## 1) Backend: enforce deterministic ordering contracts

### Scoring APIs (highest priority)

- [ ] `src/controllers/scoringController.ts`
  - [ ] In `getCategories`, add explicit ordering for nested `categoryContestants` includes.
  - [ ] Apply defensive in-memory stable sort for `cat.contestants` before response.
  - [ ] Ensure category ordering includes deterministic tie-breakers.

### Events / Contests / Categories

- [ ] `src/controllers/eventsController.ts`
  - [ ] Validate default sort behavior when `sortBy` is omitted.
  - [ ] Ensure fallback tie-breakers are consistent.
- [ ] `src/services/EventService.ts`
  - [ ] Normalize default sort logic with explicit secondary/tertiary keys.
- [ ] `src/services/ContestService.ts`
  - [ ] Ensure default ordering aligns with contract (name + id unless explicitly date-based).
- [ ] `src/controllers/categoriesController.ts`
  - [ ] Confirm `orderBy` includes stable fallback.

### Tenant and assignment data

- [ ] `src/services/TenantService.ts`
  - [ ] Align tenant list ordering with contract (`name`, `id`) unless a page explicitly opts into recency.
- [ ] `src/services/AssignmentService.ts`
  - [ ] Normalize ordering for judges/contestants/categories/events endpoints consumed by assignment UIs.

### Test additions (backend)

- [ ] Add endpoint-level tests asserting deterministic ordering for:
  - [ ] scoring category contestants,
  - [ ] events,
  - [ ] contests,
  - [ ] categories,
  - [ ] tenants,
  - [ ] assignment lists.

---

## 2) Frontend: centralize and adopt shared comparators

### Shared utility

- [ ] Create `frontend/src/utils/listOrdering.ts` with:
  - [ ] locale-aware `compareText`,
  - [ ] `compareContestants`,
  - [ ] `compareCategories`,
  - [ ] `compareContests`,
  - [ ] `compareEvents`,
  - [ ] `stableSort` helper.

### Scoring (highest priority)

- [ ] `frontend/src/pages/ScoringPage.tsx`
  - [ ] Sort categories and contestants via shared utility before rendering.
  - [ ] Keep selected category/contestant by ID after refetch/switch.

### Results

- [ ] `frontend/src/pages/ResultsPage.tsx`
  - [ ] Sort deduped event/contest/category dropdown collections after `Map` creation.

### Assignments

- [ ] `frontend/src/pages/AssignmentsPage.tsx`
  - [ ] Sort people lists (judges/contestants/tally/auditors), tenant/event/contest/category options, and filtered assignment rows.

### Emcee

- [ ] `frontend/src/pages/EmceePage.tsx`
  - [ ] Sort event/contest/category selections and category display cards.

### Admin list pages

- [ ] `frontend/src/pages/EventsPage.tsx`
  - [ ] Confirm page sort controls compose correctly with canonical tie-breakers.
- [ ] `frontend/src/pages/ContestsPage.tsx`
  - [ ] Confirm page sort controls compose correctly with canonical tie-breakers.
- [ ] `frontend/src/pages/TenantManagementPage.tsx`
  - [ ] Sort tenant cards deterministically.

### Navigation consistency

- [ ] `frontend/src/config/navigationConfig.ts`
  - [ ] Keep current name-based sorting but migrate to shared comparator to align behavior.

### Test additions (frontend)

- [ ] Unit tests for comparator helpers:
  - [ ] null handling,
  - [ ] case and locale behavior,
  - [ ] deterministic id tie-breakers.
- [ ] Page-level tests for list order in:
  - [ ] Scoring,
  - [ ] Results filters,
  - [ ] Assignments filters/lists.

---

## 3) Rollout safety and change management

- [ ] Roll out in phases:
  1. [ ] Scoring
  2. [ ] Results + Assignments + Emcee
  3. [ ] Remaining admin pages and navigation alignment
- [ ] Capture before/after screenshots for impacted pages.
- [ ] Confirm no selection-reset regressions when query data refreshes.
- [ ] Include contract checks in PR review template.

---

## 4) PR completion checklist

- [ ] Contract doc referenced in PR description.
- [ ] All touched list endpoints declare explicit ordering.
- [ ] All touched list UIs use shared comparator utilities.
- [ ] Backend and frontend tests added/updated and passing.
- [ ] Any intentional deviations from contract are documented inline and in PR notes.
