# Prisma Baseline Alignment

This runbook aligns an existing non-empty database to Prisma migration history
without executing DDL changes.

Use this once per environment database when `_prisma_migrations` is missing or
incomplete and `prisma migrate deploy` fails with `P3005`.

## Why this exists

- Current DBs were created before Prisma migration history was fully managed.
- Future schema work (including tenant-segregation hardening) should run through
  Prisma migrations, not ad-hoc SQL.

## Safety model

`scripts/deploy/prisma-baseline-align.sh` is guarded and does:

1. Prisma schema validation.
2. Drift check between DB and `prisma/schema.prisma`.
3. Dry-run listing of migration marks by default.
4. Explicit apply only when `APPLY=1`.

If drift exists, the script aborts and does not baseline.

## Commands

### Dev dry run (recommended first)

```bash
cd /srv/event-manager/dev
ENV_FILE=/etc/event-manager/event-manager-dev.env \
bash scripts/deploy/prisma-baseline-align.sh
```

### Dev apply

```bash
cd /srv/event-manager/dev
APPLY=1 ENV_FILE=/etc/event-manager/event-manager-dev.env \
bash scripts/deploy/prisma-baseline-align.sh
```

### Prod dry run

```bash
cd /srv/event-manager/dev
sudo ENV_FILE=/etc/event-manager/event-manager.env \
bash scripts/deploy/prisma-baseline-align.sh
```

### Prod apply

```bash
cd /srv/event-manager/dev
sudo APPLY=1 ENV_FILE=/etc/event-manager/event-manager.env \
bash scripts/deploy/prisma-baseline-align.sh
```

## Post-run verification

```bash
cd /srv/event-manager/dev
ENV_FILE=/etc/event-manager/event-manager-dev.env \
bash scripts/deploy/prisma-baseline-align.sh
```

Expected result:

- `Pending baseline marks: 0`
- `Prisma migration state already aligned.`

## Notes

- Keep using standard deploy SOP after baseline (`stage-release.sh` -> `activate-release.sh`).
- After alignment, schema changes should flow through migration files and
  `prisma migrate deploy`.
