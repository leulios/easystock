# EasyStock 📦 ⚡

**EasyStock** is a production-grade, multi-tenant cloud SaaS for retail inventory, Point-of-Sale (POS), and business management, specifically tailored for small-to-medium retail enterprises and multi-branch operations.

Built with **Next.js 15 (App Router)**, **React 19**, **Prisma ORM**, and **PostgreSQL (Neon Serverless)** with mathematical precision via **Decimal.js**.

---

## 🌟 Key Features

### 1. Multi-Tenant Architecture & Security
- **Strict Tenant Isolation**: All business logic and queries enforce explicit `organizationId` and `shopId` scoping at the ORM boundary.
- **Cryptographic Authentication**: 256-bit high-entropy session tokens with SHA-256 database hashing and HTTP-only Secure Lax cookies.
- **Role-Based Access Control**: Granular roles (`SUPER_ADMIN`, `SHOP_OWNER`, `SHOPKEEPER`) with customizable permissions (`canViewReports`, `canAdjustStock`, `canApplyDiscount`) and numeric POS PIN codes.
- **Administrative Governance (`/platform-admin`)**: Shop suspensions with mandatory audit reasons, account management, session revocations, and time-limited, audited support investigation sessions.

### 2. Core Inventory & Stock Movements
- **Double-Entry Ledger**: Immutable `StockMovement` tracking receipts, POS sales deductions, returns, physical count adjustments, and inter-branch transfers.
- **Inter-Branch Stock Transfers**: Atomic stock transfers between shops within the same organization with dual ledger entries (`TRANSFER_OUT` / `TRANSFER_IN`).
- **Batch CSV Import**: Robust CSV catalog importer with multi-delimiter detection, duplicate SKU collision checks, and row-level pre-flight error reporting.
- **Catalog Export**: Direct streaming CSV product and inventory balance exports.

### 3. High-Speed Point-of-Sale (POS)
- **Split Tender & Flexible Payments**: Supports Cash, Mobile Money (Telebirr, CBE Birr), Card, and Customer Store Credit ("ዱቤ").
- **Barcode Scanning**: Built-in camera barcode scanner (device camera via `BarcodeDetector` API) alongside zero-latency hardware laser scanner listeners.
- **Idempotent Checkout**: UUID-based idempotency keys and row-level inventory locks prevent duplicate charges or double stock deductions.
- **Printable Thermal Receipts**: Automatically formatted 80mm/58mm thermal printable receipts.

### 4. Financial Reporting & Ledger Precision
- **Decimal.js Precision**: Zero floating-point drift across taxes, discounts, line items, and COGS calculations using bankers rounding (`ROUND_HALF_UP`).
- **Profit & Loss (Income Statement)**: Strict separation of Gross Sales, Discounts, Net Sales, Cost of Goods Sold (COGS), Gross Profit, Operating Expenses, and Net Profit.
- **Itemized Inventory Valuation**: Valuation at cost and retail with profit margins.

### 5. Ethiopian Retail Market Adaptations
- **ETB Currency Default**: Full support for Ethiopian Birr formatting.
- **Bilingual Interface**: English and Amharic labels and receipts.
- **Local Packaging Units**: Pieces (pcs), Packets (pkt), Boxes (box), Cartons (ctn), Kilograms (kg), and Liters (L).
- **Customer Store Credit ("ዱቤ")**: Built-in customer ledger for informal credit, partial payments, and outstanding balances.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Actions)
- **UI Library**: React 19, Tailwind CSS, Lucide Icons
- **Database Layer**: [Prisma ORM 6](https://www.prisma.io/)
- **Database Engine**: PostgreSQL 16+ (Optimized for [Neon Serverless Postgres](https://neon.tech))
- **Precision Arithmetic**: `decimal.js`
- **Validation**: Zod 3
- **Testing**: Vitest (60 tests across 8 suites)
- **Type Checking**: Strict TypeScript

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js 18.18+ or 20+
- PostgreSQL database (or free Neon Serverless Postgres instance)

### 2. Clone & Install
```bash
git clone https://github.com/leulios/easystock.git
cd easystock
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and fill in your connection strings:
```bash
cp .env.example .env
```

Configure:
```env
# Neon pooled connection (PgBouncer)
DATABASE_URL="postgresql://user:password@ep-xyz-pooler.eastus2.neon.tech/easystock_db?sslmode=require&pgbouncer=true"

# Direct connection for Prisma schema migrations
DIRECT_URL="postgresql://user:password@ep-xyz.eastus2.neon.tech/easystock_db?sslmode=require"

# Cryptographic session secret (64-char hex)
SESSION_SECRET="your-generated-session-secret"
```

### 4. Database Setup & Migrations
```bash
# Push schema or run migrations
npx prisma db push

# (Optional) Seed isolated demo retail presentation dataset
npm run seed:demo

# (Optional) Provision initial Platform Super Administrator
npm run seed:admin
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

Run the automated test suite:
```bash
# Run Vitest test runner (60 tests)
npm test

# Run TypeScript compiler check
npx tsc --noEmit

# Run production build (31 routes)
npm run build
```

---

## 📚 Documentation

Detailed operational guides are available in the [`docs/`](./docs) folder:
- [`docs/production_deployment_guide.md`](./docs/production_deployment_guide.md): Connection pooling, automated backups, zero-downtime migrations, and rollback procedures.
- [`docs/platform_admin_setup.md`](./docs/platform_admin_setup.md): Super Admin bootstrap, credentials recovery, and support investigation sessions.

---

## 📄 License
Proprietary — All rights reserved.
