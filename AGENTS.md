# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains backend TypeScript code (`controllers/`, `services/`, `repositories/`, `middleware/`, `routes/`, `utils/`) with `src/server.ts` as the entry point and `dist/` as build output.
- `frontend/` contains the Vite + React app (`frontend/src/components`, `pages`, `services`, `hooks`) and UI tests in `frontend/tests/visual` and `frontend/tests/a11y`.
- `tests/` contains backend tests split by type: `unit/`, `integration/`, `contracts/`, `e2e/`, and `load/`.
- `prisma/` stores schema/migrations, `scripts/` stores operational helpers, `docs/` stores engineering documentation, and `src/templates/` plus `public/` hold templates/static assets.

## Build, Test, and Development Commands
```bash
npm run dev                         # Backend dev server (nodemon)
cd frontend && npm run dev          # Frontend dev server (Vite)
npm run build                       # Compile backend TypeScript
cd frontend && npm run build        # Build frontend + tenant manifest
npm test                            # Backend Jest suite
npm run test:ci                     # Backend CI test mode + coverage
npm run test:e2e:pw                 # Playwright tests under tests/e2e
cd frontend && npm run test:visual  # Visual regression suite
cd frontend && npm run test:a11y    # Accessibility suite
npm run test:tenant-guardrails      # Tenant isolation audit checks
```

## Coding Style & Naming Conventions
- Backend is strict TypeScript (`tsconfig.json` enables `strict`, `noImplicitAny`, and unused checks).
- Prettier defaults are enforced via `.prettierrc.json`: 2 spaces, single quotes, semicolons, trailing commas, `printWidth: 100`.
- Naming pattern: backend modules/functions use `camelCase`; React pages/components use `PascalCase` (example: `frontend/src/pages/EventsPage.tsx`).
- Frontend linting is required: `cd frontend && npm run lint` (ESLint with `jsx-a11y` rules).

## Testing Guidelines
- Jest covers backend unit/integration/contracts (`*.test.ts`, `*.spec.ts`).
- Coverage thresholds in `jest.config.js` are enforced (global 80%; services 85%; middleware/repositories 80%; controllers 75%).
- Use targeted commands while developing: `npm run test:unit`, `npm run test:integration`, `npm run test:contracts`.
- For UI changes, run visual and a11y suites before opening a PR.

## Commit & Pull Request Guidelines
- Recent history uses concise, imperative, issue-focused subjects (`fix ...`, `implement ...`).
- Prefer Conventional Commit prefixes when possible (`feat:`, `fix:`, `docs:`, `refactor:`) and keep subjects clear and scoped.
- PRs should include: problem statement, scope, test evidence (commands run), and rollback notes.
- Frontend/UI PRs should include screenshots and call out intentional snapshot updates (`cd frontend && npm run test:visual:update`).

## Security & Configuration Tips
- Never commit secrets; use `.env.example` as the baseline and keep real values in local `.env*` files.
- Run Prisma migrations against the intended environment (`npx prisma migrate deploy`) before integration/e2e testing.
