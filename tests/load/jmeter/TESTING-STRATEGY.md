# JMeter Testing Strategy

This directory should support two different kinds of tests:

1. `Workflow simulation`
2. `Stress and limit testing`

They must stay separate. A single plan should not try to prove both business-workflow correctness and saturation behavior at the same time.

## Why Split Them

The application has several classes of responses that mean very different things:

- `2xx` usually means the workflow step succeeded.
- `4xx` may be a real defect, stale fixture data, an expected business-state rejection, or an intentional protection mechanism.
- `429` may be a platform limit working as designed, not a workflow bug.

When one JMeter plan mixes normal workflow traffic with deliberate overload, the results become hard to interpret:

- expected `429` values hide real workflow regressions,
- repeated create operations against existing records create artificial `409` noise,
- static fixtures drift out of sync with live workflow state,
- pass/fail criteria stop being meaningful.

## Test Types

### Workflow Simulation

Purpose:
Validate that realistic concurrent user behavior succeeds end-to-end with low unexpected error rates.

Questions it should answer:

- Can judges, tally, auditors, board, and admins complete the expected workflow?
- Do the target routes remain stable under plausible concurrency?
- Are any `4xx` or `5xx` responses unexpected for a normal event session?

Characteristics:

- Uses valid tenant-scoped data only.
- Uses realistic numbers of concurrent users per role.
- Uses one real account per concurrently active session wherever possible.
- Uses response-driven IDs for state transitions.
- Applies think time and ramp-up intended to resemble actual event operations.
- Treats `429` as a test design problem unless the test explicitly documents otherwise.

Primary pass criteria:

- Near-zero unexpected `4xx`/`5xx`.
- No systematic `409`, `422`, or `429`.
- Workflow completion paths succeed consistently.
- Latency remains within agreed p95 and p99 targets for the environment.

### Stress And Limit Testing

Purpose:
Measure how the system behaves when pushed beyond expected traffic levels.

Questions it should answer:

- At what concurrency or request rate do rate limiters begin rejecting traffic?
- Where do latency and throughput degrade sharply?
- Which endpoints become bottlenecks first?
- Do protections fail safely under burst conditions?

Characteristics:

- May intentionally exceed realistic user counts.
- May target a narrow set of endpoints instead of a full workflow.
- May treat some `429` and business conflicts as expected outcomes.
- Focuses on thresholds, saturation points, and degradation patterns.

Primary pass criteria:

- The system degrades predictably.
- Expected `429` responses are returned instead of unstable behavior.
- Error rates and latency curves are measured, not misclassified as workflow failures.
- Infrastructure remains healthy enough to recover after load subsides.

## Fixture Rules

These rules apply to both test types unless a plan explicitly documents an exception.

- All CSV data must come from one tenant only.
- All IDs must belong to the exact environment and event window being tested.
- Placeholder rows must never be used for any non-smoke run.
- Each CSV should have enough rows for the intended concurrency.
- Rows must be internally consistent across `category_id`, `contestant_id`, `score_id`, `judge_id`, and `criterion_id`.
- CSV files should be validated before every run.

Additional workflow-simulation rules:

- Judge create-score traffic must use fresh tuples that do not already exist as scores.
- Judge update/commentary traffic must use score IDs returned by the current thread or a pre-validated update dataset.
- Tally, auditor, and board actions should be driven from readiness or pending-state responses instead of blindly replaying static rows.
- If a role has fewer accounts than active threads, the plan is not modeling real users and must be treated as stress, not workflow.

## Account Model

Workflow simulation should reflect how real sessions behave:

- Prefer one account per active virtual user.
- Reusing one credential across many simultaneous threads is acceptable only for explicit stress tests.
- Role counts should match the expected event profile for the target tenant.

As a rule, if the number of concurrent sessions for a role is larger than the available real accounts for that role, the test is no longer a realistic workflow simulation.

## Response Classification

Each plan should declare which statuses are:

- `success`
- `expected business rejection`
- `expected protection response`
- `unexpected failure`

Recommended defaults for workflow simulation:

- `2xx`: success
- `409`: unexpected unless the specific step is documented as retriable or conflict-prone
- `422`: unexpected
- `429`: unexpected
- `5xx`: unexpected

Recommended defaults for stress and limit tests:

- `2xx`: success
- `409`: usually neutral or expected, depending on the test
- `422`: unexpected unless intentionally testing invalid data handling
- `429`: often expected
- `5xx`: unexpected

## Plan Design Guidance

Workflow plans should:

- bootstrap session state once per virtual user,
- use realistic ramp-up,
- include role-specific think time,
- extract IDs from earlier responses when later steps depend on workflow state,
- avoid repeatedly creating the same logical record,
- fail loudly on invalid fixtures before sustained execution begins.

Stress plans should:

- isolate the bottleneck being tested,
- state whether they are bypassing or intentionally exercising rate limiters,
- document whether repeated credentials or repeated record targets are intentional,
- capture throughput, p95, p99, and response-code distributions per sampler.

## Execution Order

Recommended order for any new JMeter work in this directory:

1. Validate fixtures and account coverage.
2. Run a smoke test with very low concurrency.
3. Run the workflow simulation plan and fix unexpected application or fixture errors.
4. Run the stress or limit plan to measure thresholds and degradation.

Do not promote a stress plan to the default regression signal for workflow health.

## Reporting Expectations

Every run should record:

- target environment and tenant slug,
- plan name and purpose,
- thread counts, ramp-up, duration, and timers,
- input fixture source and generation time,
- response-code counts by sampler,
- overall throughput and latency percentiles,
- whether any `409`, `422`, or `429` were expected for that run type.

## Immediate Implications For This Directory

The intended split for this directory is:

- `workflow-simulation.jmx` for realistic, workflow-oriented concurrency
- `stress-concurrency.jmx` for saturation and protection testing

The legacy `active-event-concurrency.jmx` should not be the default signal for either use case. It should be treated as a transitional reference only.

`workflow-simulation.jmx` should be treated as workflow-oriented only because it now separates judge create targets from downstream live-state fixtures. It still needs tenant-scoped, validated data to be meaningful.

The older mixed-plan pattern required refactoring because it combined concerns that should stay separate:

- separate create-score traffic from update/commentary traffic,
- use response-driven state transitions for tally, auditor, and board flows,
- use validated tenant-scoped fixtures,
- and use role counts that reflect actual concurrent human sessions.

Any plan that intentionally pushes thread counts, reuses credentials heavily, or probes rate-limiter thresholds should live as a separate stress-oriented JMX with its own README section and pass criteria.
