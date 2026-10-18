# EasyStock SaaS: Platform Administrator Setup & Operations Guide

## 1. Secure Initial Administrator Provisioning

EasyStock enforces a strict security standard: **There is no public administrative registration form, no hardcoded production passwords, and no undocumented backdoors.**

Platform administrators hold global governance privileges and can only be provisioned through secure server-side CLI execution.

### CLI Setup Procedure

To provision the primary Platform Super Administrator:

```bash
# Set explicit environment credentials in your deployment environment or run interactively
ADMIN_EMAIL="admin@easystock.app" ADMIN_PASSWORD="YourStrongPassword123!" ADMIN_NAME="Lead Architect" npm run seed:admin
```

### Script Execution Verification:
The seed script (`scripts/seed-admin.ts`):
1. Verifies password complexity (minimum 10 characters, upper, lower, number, special).
2. Hashes the password using `bcrypt` with 12 salt rounds.
3. Assigns `platformRole = PlatformRole.SUPER_ADMIN`.
4. Writes an immutable audit entry recording administrator creation.

---

## 2. Route Namespace & Authorization Boundary

All administrative capabilities reside exclusively under the `/platform-admin` route namespace:

- `/platform-admin`: System telemetry, monitored runtime diagnostics, and global metrics.
- `/platform-admin/shops`: Shop outlet search, inspection, and suspension with mandatory reasons.
- `/platform-admin/accounts`: Cross-tenant user directory, session revocation, and recovery assistance.
- `/platform-admin/support`: Customer issue tracking and auditable, time-limited investigation sessions.
- `/platform-admin/audit-logs`: Append-only, tamper-evident security audit trail with payload diffs.
- `/platform-admin/settings`: Global maintenance banners and onboarding controls.

### Defense-in-Depth Enforcement
- **Edge & Layout Guard**: `src/app/platform-admin/layout.tsx` validates session tokens and blocks any non-super-admin user (redirecting to `/`).
- **Domain Service Guard**: Every function in `src/lib/services/platform-admin-service.ts` calls `assertSuperAdmin(context)`, rejecting unauthorized direct API calls.
- **Credential Protection**: Passwords and password hashes are strictly omitted from all admin query results.

---

## 3. Shop Suspension Policy & Operational Impact

When an administrative suspension is enacted:
1. **Mandatory Reason**: Administrators must specify an audit reason (minimum 5 characters).
2. **Operational Freeze**: The target shop's `isActive` flag is set to `false`. Cashier POS checkouts, inventory adjustments, and goods receiving vouchers are atomically rejected with a clear message explaining the suspension reason.
3. **Data Integrity**: **No shop or customer financial data is ever deleted.** All past transactions, receipts, and stock ledgers remain 100% intact.
4. **Reactivation**: Can be restored instantly with a verified reactivation memo.

---

## 4. Customer Support & Investigation Protocol

To investigate customer-reported issues without compromising tenant privacy or creating security vulnerabilities:
1. **Zero Impersonation Policy**: Unrestricted user impersonation is disabled by architectural policy.
2. **Time-Limited Investigation Sessions**: If a customer reports an issue requiring investigation, the administrator logs an authorized support session (`/platform-admin/support`) specifying the ticket reference and reason.
3. **Session Windows**: Sessions are capped at 30, 60, or 120 minutes.
4. **Audit Tagging**: All administrative actions performed during this window are tagged with the unique Session ID in the immutable audit log.
