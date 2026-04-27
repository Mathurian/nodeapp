# NPM Remediation Matrix

This matrix is based on the current installed dependency tree and the warnings seen during release staging with `npm ci --omit=dev`.

Scope:
- production/runtime dependencies only
- deprecations and high-risk chains currently visible locally
- no live advisory IDs, because `npm audit` could not reach `registry.npmjs.org` from this environment during analysis

## Summary

Current staging summary:

- `47` vulnerabilities total
- `3` low
- `12` moderate
- `28` high
- `4` critical

Warnings observed during staging:

- deprecated `lodash.get@4.4.2`
- deprecated `lodash.isequal@4.5.0`
- deprecated `multer@1.4.5-lts.2`
- unsupported `fstream@1.0.12`

## Matrix

| Priority | Package / Chain | Direct? | Current Version | Why It Matters | Codebase Usage | Suggested Action | Expected Risk / Effort |
|---|---|---:|---:|---|---|---|---|
| P1 | `multer` | Yes | `1.4.5-lts.2` | Direct runtime upload middleware; package line is explicitly flagged as vulnerable and old | Used across upload-heavy routes including `src/routes/uploadRoutes.ts`, `src/routes/usersRoutes.ts`, `src/routes/settingsRoutes.ts`, `src/routes/backupRoutes.ts`, `src/routes/bulkRoutes.ts`, `src/routes/scoreFileRoutes.ts`, `src/routes/bioRoutes.ts`, `src/routes/emceeRoutes.ts` | Upgrade to `multer@2`, run route-level upload regression tests, confirm callback/file filter compatibility | Medium effort, medium regression risk, highest security value |
| P2 | `swagger-jsdoc -> swagger-parser -> @apidevtools/swagger-parser -> z-schema -> lodash.get/lodash.isequal` | No | `swagger-jsdoc@6.2.8`, `swagger-parser@10.0.3`, `z-schema@5.0.5` | Deprecation chain in documentation stack; lower operational blast radius than upload middleware | Swagger generation is configured in `src/config/swagger.config.ts` and exposed from `src/server.ts` | Upgrade `swagger-jsdoc` and related parser chain to versions that remove `z-schema` if available; if not, evaluate alternate OpenAPI generation tooling later | Low-to-medium effort, low runtime risk |
| P3 | `exceljs -> unzipper -> fstream` | No | `exceljs@4.4.0`, `unzipper@0.10.14`, `fstream@1.0.12` | Unsupported archive dependency in runtime export path | Used by `src/services/ExportService.ts`, `src/services/ReportExportService.ts`, `src/jobs/ReportJobProcessor.ts` | First try upgrading `exceljs`; if chain remains, evaluate replacement strategy only after confirming export compatibility requirements | Medium effort, medium regression risk |
| P4 | `exceljs -> fast-csv -> @fast-csv/format -> lodash.isequal` | No | `fast-csv@4.3.6`, `lodash.isequal@4.5.0` | Deprecated utility in export chain; less urgent than `fstream` and `multer` | Same export/report usage paths as `exceljs` | Address indirectly through `exceljs` upgrade; do not chase separately first | Low incremental effort once `exceljs` is touched |

## Package Detail

### 1. `multer`

Installed:

- `multer@1.4.5-lts.2`

Declared in:

- `package.json`

Observed route usage:

- `src/routes/bulkRoutes.ts`
- `src/routes/settingsRoutes.ts`
- `src/routes/uploadRoutes.ts`
- `src/routes/backupRoutes.ts`
- `src/routes/scoreFileRoutes.ts`
- `src/routes/bioRoutes.ts`
- `src/routes/usersRoutes.ts`
- `src/routes/emceeRoutes.ts`

Why it is first:

- direct runtime dependency
- exposed on multiple upload endpoints
- explicitly called out by npm during staging as a package line with known vulnerabilities

Upgrade concerns:

- file filter callback behavior
- disk vs memory storage behavior
- restore/upload admin flows
- CSV import flows

Recommended validation after upgrade:

- file upload smoke tests on user images, bios, theme assets, score files
- backup restore file upload
- CSV user import

### 2. Swagger chain

Installed chain:

- `swagger-jsdoc@6.2.8`
- `swagger-parser@10.0.3`
- `@apidevtools/swagger-parser@10.0.3`
- `z-schema@5.0.5`
- `lodash.get@4.4.2`
- `lodash.isequal@4.5.0`

Why it is second:

- documentation feature, not core transactional runtime path
- lower blast radius than upload middleware
- likely solvable by upgrading one top-level package chain

Observed usage:

- `src/config/swagger.config.ts`
- `src/server.ts`

Recommended approach:

- inspect latest compatible `swagger-jsdoc` release
- confirm generated spec shape is unchanged enough for `/api-docs-v2`
- run a basic docs smoke test after upgrade

### 3. Excel export chain

Installed chain:

- `exceljs@4.4.0`
- `unzipper@0.10.14`
- `fstream@1.0.12`
- `fast-csv@4.3.6`
- `lodash.isequal@4.5.0`

Why it is third:

- runtime path, but narrower than uploads
- used in export/report generation rather than core navigation/auth/scoring
- likely more upgrade sensitivity due to workbook generation behavior

Observed usage:

- `src/services/ExportService.ts`
- `src/services/ReportExportService.ts`
- `src/jobs/ReportJobProcessor.ts`

Recommended approach:

- test if a newer `exceljs` removes `unzipper`/`fstream`
- preserve generated file compatibility before release
- verify report file generation in unit/integration tests and manual smoke

## Recommended Execution Order

1. Upgrade `multer`
2. Upgrade `swagger-jsdoc` chain
3. Upgrade `exceljs`
4. Re-run `npm ci --omit=dev`
5. Re-run `npm audit --omit=dev` from an environment with registry access
6. Rebuild and run upload/export/docs smoke tests

## Decision Guidance

If only one package family is addressed next, it should be:

- `multer`

Reason:

- it is direct
- it is in active runtime request paths
- it carries the highest security value per change made
