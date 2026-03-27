# List Ordering Contract (Internal)

**Status:** Draft  
**Owner:** Platform + Frontend  
**Scope:** Backend API defaults and frontend display ordering for all list UIs

## Why this exists

We have inconsistent list ordering behavior across screens (for example, judges switching contests/categories and seeing contestants in different positions). This document defines a canonical ordering contract so list UIs are deterministic and predictable.

---

## Principles

1. **Ordering is a product contract**, not an incidental UI detail.
2. **Backend must return deterministic default order** for every list endpoint.
3. **Frontend must defensively apply the same comparator** before rendering.
4. **Every sort includes a stable tiebreaker** (`id`) to avoid jitter.
5. **Selection state is ID-based**, never index-based.

---

## Canonical ordering rules by entity

## Contestants

Primary intent: preserve judge scanning position and score-entry rhythm.

Sort:

1. `contestantNumber` ascending, **null last**
2. `name` ascending (case-insensitive locale compare)
3. `id` ascending

Notes:

- If `contestantNumber` is not used in a tenant/event, fallback naturally to name + id.
- Never rely on DB insertion order.

## Categories

Sort:

1. `name` ascending
2. `id` ascending

## Contests

Sort:

1. `name` ascending
2. `id` ascending

If displayed within event context:

- still sort by `name` then `id` (event already scoped).

## Events

Default API order:

1. `startDate` descending (most recent first) **or** ascending if page-specific UX requires timeline mode
2. `name` ascending
3. `id` ascending

Each page must explicitly declare intended direction.

## Tenants

Sort:

1. `name` ascending
2. `id` ascending

## Judges / Users

Sort:

1. `name` ascending
2. `email` ascending (if needed for disambiguation)
3. `id` ascending

## Assignments (rows)

Sort:

1. person name ascending
2. event name ascending
3. contest name ascending
4. category name ascending
5. `id` ascending

---

## Backend implementation requirements

1. Every `findMany` list query must include explicit multi-field `orderBy`.
2. Nested relation arrays included in parent payloads (for example, `categoryContestants`) must also include `orderBy`.
3. Endpoints with `sortBy`/`sortDirection` should:
   - validate allowed fields,
   - always append deterministic tie-breakers.
4. Never depend on default DB ordering.

### Example (Prisma)

```ts
orderBy: [
  { contestantNumber: 'asc' }, // if supported/nullable
  { name: 'asc' },
  { id: 'asc' },
]
```

For null-last behavior that Prisma cannot express directly in some cases, do:

- DB order as close as possible,
- final in-memory stable sort before response.

---

## Frontend implementation requirements

1. Use shared list-ordering utilities only (no ad-hoc inline sort logic).
2. Deduplicate/merge first, then sort once at the end.
3. Render from memoized sorted arrays.
4. Preserve selected item by ID after refetch.
5. All `<select>` option lists follow canonical comparators.

---

## Shared utility contract (frontend)

Create: `frontend/src/utils/listOrdering.ts`

Required exports (draft API):

- `compareText(a: string, b: string): number`
- `compareContestants(a, b): number`
- `compareCategories(a, b): number`
- `compareContests(a, b): number`
- `compareEvents(a, b, direction: 'asc' | 'desc' = 'desc'): number`
- `stableSort<T>(items: T[], compare: (a: T, b: T) => number): T[]`

Behavior:

- case-insensitive locale-aware compare (`Intl.Collator` recommended),
- deterministic fallback to `id`,
- no mutation of source arrays.

---

## Suggested rollout plan

## Phase 1 (Critical UX)

- Scoring flow:
  - backend `scoring/categories` contestants order,
  - frontend `ScoringPage` contestant/category rendering order.

## Phase 2 (High traffic admin workflows)

- Results filters (event/contest/category dropdowns),
- Assignments filters and person lists,
- Emcee selectors and category lists.

## Phase 3 (Global consistency)

- Events/Contests/Categories/Tenants list pages,
- Any remaining list/table/select surfaces.

## Phase 4 (Guardrails)

- Add backend ordering tests per list endpoint,
- Add frontend comparator unit tests,
- Add PR checklist item: “Uses canonical list ordering contract.”

---

## Test expectations

### Backend tests

- Endpoint returns deterministic order on repeated calls with same data,
- Null handling verified (for example, contestantNumber null-last),
- Tie-breaker behavior verified.

### Frontend tests

- Comparator unit tests (happy path + null + tie cases),
- Page-level tests for selector/list ordering in Scoring, Results, Assignments.

---

## Non-goals (for this draft)

- User-customizable per-screen sorting,
- Drag-and-drop manual ordering,
- Persisted personal sort preferences.

---

## Open decisions

1. Event default sort direction by page (`asc` timeline vs `desc` recent),
2. Whether contests should ever prioritize `createdAt` over `name` in admin pages,
3. Whether contestant display should support “name-first mode” for tenants without numbers.

---

## Definition of done

- All list endpoints and major list UIs use canonical ordering,
- No index-based selection behavior remains,
- Regression tests added and passing,
- Contract referenced in onboarding/engineering docs.
