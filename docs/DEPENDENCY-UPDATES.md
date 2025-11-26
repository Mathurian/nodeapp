# Dependency Update Process

**Last Updated:** November 25, 2025
**Status:** Active
**Owner:** Engineering Team

---

## Overview

This document outlines the process for managing automated dependency updates via Dependabot and manual dependency reviews.

---

## Automated Updates (Dependabot)

### Configuration

Dependabot is configured in `.github/dependabot.yml` to:
- Check for updates **weekly on Mondays at 9:00 AM ET**
- Group minor and patch updates together
- Separate backend, frontend, GitHub Actions, and Docker updates
- Limit to 10 open PRs to avoid overwhelming the team

### Update Types

#### 1. Patch Updates (x.y.Z)
**Auto-merge eligible:** ✅ Yes (after CI passes)

- Bug fixes and security patches
- No breaking changes expected
- Examples: `1.2.3` → `1.2.4`

**Process:**
1. Dependabot creates PR
2. CI runs automated tests
3. If all tests pass → Auto-merge
4. If tests fail → Manual review required

#### 2. Minor Updates (x.Y.z)
**Auto-merge eligible:** ⚠️ Development dependencies only

- New features, backward compatible
- Examples: `1.2.3` → `1.3.0`

**Process:**
1. Dependabot creates grouped PR
2. CI runs automated tests
3. Engineering team reviews weekly
4. Merge if no issues found

#### 3. Major Updates (X.y.z)
**Auto-merge eligible:** ❌ Never

- Breaking changes expected
- Requires careful review and testing
- Examples: `1.2.3` → `2.0.0`

**Process:**
1. Dependabot creates PR
2. Engineering team evaluates impact
3. Check migration guides and changelogs
4. Test in development environment
5. Schedule for deployment window
6. Merge after approval

---

## Manual Review Checklist

When reviewing Dependabot PRs, check:

### 1. Breaking Changes
- [ ] Read the CHANGELOG or release notes
- [ ] Check for API changes
- [ ] Review migration guides
- [ ] Identify deprecated features

### 2. Security
- [ ] Check if update addresses CVEs
- [ ] Review security advisories
- [ ] Verify package maintainer is trusted

### 3. Testing
- [ ] All CI tests pass
- [ ] Manual smoke testing if needed
- [ ] Regression testing for major updates

### 4. Dependencies
- [ ] Check transitive dependency updates
- [ ] Verify peer dependency compatibility
- [ ] Ensure no version conflicts

### 5. Documentation
- [ ] Update docs if API changed
- [ ] Update examples if needed
- [ ] Document migration steps for major updates

---

## Ignored Packages

The following packages are **ignored for automatic major updates**:

### Backend
| Package | Reason | Action |
|---------|--------|--------|
| `prisma` | Requires database migrations | Manual upgrade quarterly |
| `@prisma/client` | Coupled with Prisma | Upgrade with Prisma |
| `express` | Waiting for v5 stability | Review in Q3 2026 |
| `typescript` | Major versions need testing | Upgrade semi-annually |

### Frontend
| Package | Reason | Action |
|---------|--------|--------|
| `react` | Major versions need migration | Review when v19 is stable |
| `react-dom` | Coupled with React | Upgrade with React |
| `vite` | Breaking changes in major versions | Review changelogs carefully |

---

## Weekly Dependency Review Process

**When:** Every Monday at 10:00 AM ET (after Dependabot runs)
**Who:** Engineering team lead + 1 developer
**Duration:** ~30 minutes

### Agenda

1. **Review Open PRs** (10 min)
   - Check all Dependabot PRs
   - Prioritize security updates
   - Group related updates

2. **Merge Safe Updates** (10 min)
   - Merge patch updates with passing tests
   - Merge grouped minor dev dependencies

3. **Plan Major Updates** (10 min)
   - Identify major updates
   - Assign owner for each
   - Schedule testing/deployment

### Decision Matrix

| Update Type | Dev Dependency | Production Dependency |
|-------------|----------------|----------------------|
| Patch | Auto-merge | Auto-merge (if tests pass) |
| Minor | Auto-merge | Review + merge same week |
| Major | Review + plan | Review + schedule for sprint |

---

## Emergency Security Updates

For **critical security vulnerabilities** (CVSS ≥ 7.0):

1. **Immediate Action Required**
   - Deploy patch within 24-48 hours
   - Skip normal review process if low-risk

2. **Process:**
   ```bash
   # Check for security advisories
   npm audit

   # Update specific package
   npm update <package-name>

   # Run tests
   npm test

   # Deploy to staging
   npm run deploy:staging

   # If tests pass, deploy to production
   npm run deploy:production
   ```

3. **Communication:**
   - Notify team in #engineering Slack channel
   - Document in incident log
   - Update security dashboard

---

## Manual Dependency Audits

### Quarterly Review (Every 3 months)

**Check for:**
- Outdated major versions (>6 months old)
- Deprecated packages
- Packages with known vulnerabilities
- Unused dependencies
- Duplicate packages (same functionality)

**Tools:**
```bash
# List outdated packages
npm outdated

# Security audit
npm audit

# Check for unused dependencies
npx depcheck

# Find duplicate packages
npm ls <package-name>

# Analyze bundle size
npm run analyze
```

### Annual Deep Dive (Yearly)

**Review:**
- All production dependencies
- Remove unused packages
- Consolidate similar packages
- Evaluate alternatives (better maintained, smaller, faster)
- Update to latest stable versions

---

## Common Issues & Solutions

### Issue: Tests fail after minor update

**Solution:**
1. Check if it's a flaky test (re-run)
2. Review package changelog for subtle breaking changes
3. Check if peer dependencies need updating
4. Roll back and create issue for investigation

### Issue: Multiple PRs for same package

**Reason:** Different dependency paths (direct + transitive)

**Solution:**
1. Merge the direct dependency PR first
2. Closerelated transitive dependency PRs
3. Run `npm dedupe` to clean up

### Issue: Merge conflicts in package-lock.json

**Solution:**
```bash
# Resolve conflicts
git checkout --theirs package-lock.json

# Regenerate lock file
npm install

# Commit
git add package-lock.json
git commit -m "chore: resolve package-lock conflicts"
```

---

## Metrics & Monitoring

### Track Weekly:
- Number of dependency PRs created
- Number of PRs merged
- Average time to merge
- Number of security patches applied

### Track Monthly:
- Packages with major updates available
- Percentage of dependencies up-to-date
- Security vulnerabilities resolved

### Track Quarterly:
- Dependency update velocity
- Breaking change incidents
- Time spent on dependency management

**Dashboard:** `/admin/metrics/dependencies` (coming Q2 2026)

---

## Best Practices

### DO ✅
- Review changelogs before merging
- Test major updates in staging first
- Keep package-lock.json committed
- Run `npm audit` before releases
- Document breaking changes
- Update dependencies regularly

### DON'T ❌
- Auto-merge major updates
- Ignore security advisories
- Skip testing after updates
- Update all packages at once
- Merge without reviewing CI results
- Deploy on Fridays (unless critical security fix)

---

## Escalation

### When to Escalate to Team Lead:
- Critical security vulnerability
- Breaking change in production dependency
- Major version update needed urgently
- Dependency conflict cannot be resolved

### When to Escalate to CTO:
- Zero-day vulnerability affecting production
- Dependency abandoned/deprecated (no replacement)
- Major migration required (>2 weeks of work)

---

## Related Documentation

- **Security Policy:** `docs/SECURITY.md`
- **Deployment Process:** `docs/DEPLOYMENT.md`
- **Testing Strategy:** `docs/TESTING.md`
- **Sprint Planning:** `docs/24Nov25/00-IMPLEMENTATION-ROADMAP.md`

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-11-25 | Initial documentation | Claude Code |

---

*Next Review: 2026-02-25*
