# EasyStock SaaS: Production Deployment, Operations & Rollback Guide

## 1. Architectural Overview & Topology

EasyStock is a multi-tenant retail inventory and POS SaaS built with:
- **Framework**: Next.js 15 (App Router, React 19, Server Actions)
- **Database Engine**: PostgreSQL 16+ (hosted on Neon Serverless Postgres or AWS RDS/Aurora)
- **Data Access Layer**: Prisma ORM with connection pooling & Decimal.js monetary precision
- **Authentication**: High-entropy 256-bit cryptographic session tokens with SHA-256 database hashing and HTTP-only Secure Lax cookies
- **Tenant Isolation**: Soft multi-tenancy enforced at the ORM query boundary with strict tenant context validation (`shopId` & `organizationId`)

---

## 2. Database Topology & Connection Pooling

### 2.1 The Two-URL Requirement (Serverless Connection Pooling)
Prisma requires two database URLs when running with serverless pooling (e.g. Neon, Supabase, PgBouncer):
1. **`DATABASE_URL`**: Pooled connection URL (e.g., PgBouncer transaction-mode on port 6543 or Neon pooled endpoint `*-pooler.eastus2.neon.tech`). Used for runtime Next.js server actions, queries, and transactions.
2. **`DIRECT_URL`**: Direct TCP connection URL (port 5432) without PgBouncer. Mandatory for Prisma schema migrations (`npx prisma migrate deploy`), advisory locks, and DDl operations.

```env
# Runtime pooled queries (PgBouncer transaction mode)
DATABASE_URL="postgresql://user:password@ep-xyz-pooler.eastus2.neon.tech/easystock_db?sslmode=require&pgbouncer=true&connection_limit=20"

# Direct connection for schema migrations & DDL locks
DIRECT_URL="postgresql://user:password@ep-xyz.eastus2.neon.tech/easystock_db?sslmode=require"
```

### 2.2 Connection Limit Sizing
- In serverless hosting (e.g. Vercel, AWS Lambda), set `connection_limit=1` to `3` per container on `DATABASE_URL`.
- Neon's PgBouncer can handle up to 10,000 idle pooled connections while routing queries to 50–100 PostgreSQL worker processes.

---

## 3. Environment Variable Specification

| Variable Name | Required | Default / Format | Purpose | Security Classification |
|---|---|---|---|---|
| `DATABASE_URL` | **Yes** | `postgresql://...` | Transaction-pooled DB URL | **Restricted Secret** |
| `DIRECT_URL` | **Yes** | `postgresql://...` | Direct DDL DB connection | **Restricted Secret** |
| `SESSION_SECRET` | **Yes** | 64-char hex string | HMAC/Signing secret | **High Confidentiality** |
| `NODE_ENV` | **Yes** | `production` | Production optimizations | Public config |
| `NEXT_PUBLIC_APP_URL`| **Yes**| `https://app.easystock.com` | Base URL for links | Public config |
| `PLATFORM_ADMIN_EMAIL`| Optional| `admin@easystock.app` | Initial bootstrap admin | Internal config |
| `DEFAULT_CURRENCY` | No | `ETB` | Platform default currency | Public config |
| `ENABLE_AUDIT_LOGS` | No | `true` | Append-only audit logger | Public config |

### Secret Generation
Generate high-entropy secrets using OpenSSL:
```bash
openssl rand -hex 32
```

---

## 4. Production Database Migration Pipeline

### 4.1 Pre-Flight Deployment Sequence
Never run `prisma db push` in production. Always use versioned migrations:
```bash
# 1. Validate Prisma schema syntax
npx prisma validate

# 2. Check pending migrations without applying
npx prisma migrate status

# 3. Apply pending migrations using DIRECT_URL
npx prisma migrate deploy
```

### 4.2 Zero-Downtime Migration Rules
1. **Never drop columns or tables in a single deployment**: First deprecate the field in code, deploy code, then drop the column in a follow-up release.
2. **Additive only**: Adding nullable columns, new tables, or new indexes is safe with active web traffic.
3. **Non-blocking indexes**: For large PostgreSQL tables (>1M rows), use `CREATE INDEX CONCURRENTLY` in direct SQL migrations.

---

## 5. Database Backup, PITR & Disaster Recovery

### 5.1 Automated Point-In-Time Recovery (PITR) via Neon
When using Neon Serverless Postgres:
- Automated continuous WAL archiving provides 30-day Point-in-Time Recovery down to the second.
- Instant branch creation allows restoring a snapshot into a new database branch in <3 seconds without taking production offline.

### 5.2 Nightly Automated Logical Backup (pg_dump)
For offsite backup storage (e.g. AWS S3 / Cloudflare R2):
```bash
#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/easystock"
BACKUP_FILE="${BACKUP_DIR}/easystock_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

# Export data and schema excluding session tables if desired
pg_dump "${DIRECT_URL}" \
  --format=custom \
  --no-owner \
  --no-privileges \
  | gzip > "${BACKUP_FILE}"

# Sync to encrypted offsite bucket
aws s3 cp "${BACKUP_FILE}" s3://easystock-production-backups/daily/ --sse aws:kms

# Retention: Delete local backups older than 14 days
find "${BACKUP_DIR}" -type f -name "*.sql.gz" -mtime +14 -delete
```

### 5.3 Backup Restoration Drill
To test or execute a restoration:
```bash
# 1. Create a staging/recovery database
createdb -h localhost -U postgres easystock_recovery

# 2. Restore from compressed custom dump
gunzip -c easystock_20261018.sql.gz | pg_restore -d "${RECOVERY_DATABASE_URL}" --clean --if-exists
```

---

## 6. Application Rollback Playbook

If a critical bug, regression, or service disruption occurs post-deployment:

### 6.1 Fast Application Rollback (Code-Level)
1. In Vercel or your container orchestrator:
   - Identify the previous healthy deployment hash.
   - Click **Instant Rollback** or update deployment image tag to previous commit (`git rev-parse HEAD~1`).
   - Rollback executes in < 30 seconds with 0 downtime.

### 6.2 Database Rollback (Schema-Level)
- If the new code introduced a faulty migration that was already applied:
  1. Determine if the database state is corrupt or simply has an unreferenced new column.
  2. If unreferenced: Leave the column in place; rolling back the Next.js app code is sufficient.
  3. If destructive schema modification occurred:
     - In Neon: Instant branch restore to the PITR timestamp 1 minute prior to deployment.
     - Switch `DATABASE_URL` and `DIRECT_URL` in environment variables to point to the restored branch.
     - Redeploy application with the prior commit.

---

## 7. Security Hardening & Session Governance

1. **Cookie Invariants**:
   - `httpOnly: true`: Blocks client-side JavaScript access (`document.cookie`), preventing XSS credential theft.
   - `secure: true`: Mandates HTTPS transport in production.
   - `sameSite: 'lax'`: Mitigates Cross-Site Request Forgery (CSRF).
   - Session duration: 7 days with automatic slide/invalidation on password reset.
2. **Password & Recovery Safety**:
   - Passwords hashed with bcrypt (cost factor 10).
   - Single-use recovery tokens hashed with SHA-256 before storage; automatically expire after 60 minutes.
   - Recovery link consumption atomically revokes all existing sessions in the database.
3. **No Secret Leakage**:
   - Never print `password`, `passwordHash`, or session tokens in logs or responses.
   - Platform admin endpoints explicitly project out sensitive fields.

---

## 8. Monitoring, Health Checks & Telemetry

- **Telemetry Endpoint**: `getSystemHealthTelemetry()` monitors:
  - Active PostgreSQL connection state (`SELECT 1`).
  - Database latency (ms).
  - Background task status.
  - Active vs. suspended shop counters.
- **Log Sanitation**:
  - Structured JSON logs with timestamp, shopId, userId, action, and severity.
  - PII and authorization tokens stripped via logger middleware.
- **Alerting Thresholds**:
  - DB Latency > 250ms for 3 consecutive checks.
  - 5xx Server Error Rate > 1% over 5 minutes.
  - Consecutive failed logins > 5 for a single IP / account (potential brute-force).
