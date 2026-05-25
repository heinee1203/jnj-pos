# JNJ POS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fork APEX POS into JNJ POS — a stripped-down school supply & general merchandise POS with case/piece selling and tiered pricing.

**Architecture:** Copy-and-strip approach. Copy the entire APEX POS monorepo, delete ~30 API modules / ~32 DB schemas / ~12 web route trees, rebrand from Apex to JNJ, apply professional blue color scheme, then add UoM fields, price_tiers table, and sale line unit support.

**Tech Stack:** pnpm monorepo, Fastify 5, Next.js 15, React 19, Tailwind CSS 4, PostgreSQL 16, Drizzle ORM

**Source project:** `C:\Users\Admin\Downloads\CLAUDE\APEX_POS`
**Target project:** `C:\Users\Admin\Downloads\CLAUDE\JNJ POS`

---

## Task 1: Copy Source & Initialize Git

**Files:**
- Copy: entire `APEX_POS/` contents → `JNJ POS/`
- Skip: `node_modules/`, `.env`, `*.log`, `tmp/`

- [ ] **Step 1: Copy project files (excluding node_modules and logs)**

```powershell
$src = "C:\Users\Admin\Downloads\CLAUDE\APEX_POS"
$dst = "C:\Users\Admin\Downloads\CLAUDE\JNJ POS"
$exclude = @("node_modules", "tmp", ".env", "api-dev.err.log", "api-dev.out.log", "api-server.err.log", "api-server.out.log", "base44-audit", "updated_export_items.csv")
Get-ChildItem -Path $src -Exclude $exclude | ForEach-Object {
    if ($_.PSIsContainer) {
        if ($_.Name -notin $exclude) {
            Copy-Item -Path $_.FullName -Destination "$dst\$($_.Name)" -Recurse -Force
        }
    } else {
        Copy-Item -Path $_.FullName -Destination "$dst\$($_.Name)" -Force
    }
}
```

- [ ] **Step 2: Remove leftover APEX-specific files from JNJ POS root**

```powershell
$jnj = "C:\Users\Admin\Downloads\CLAUDE\JNJ POS"
$removeFiles = @(
    "AR-AGING-CRITIQUE.md", "CUSTOMER-LIST-CRITIQUE.md", "DV-SOA-INVESTIGATION.md",
    "PDC-INVESTIGATION.md", "SUPPLIER-INVOICES-CRITIQUE-v2.md",
    "SUPPLIER-SOA-HISTORY-CRITIQUE.md", "VOUCHER-COMPARISON.md",
    "audit-report.md", "customer-audit-report.md", "customer-fix-prompt.md",
    "fix-prompt.md", "stock-velocity-audit.md", "stock-velocity-fix-prompt.md",
    "test-api-v2.sh", "test-api-v3.sh", "test-api.sh", "test-bugfix-verify.sh",
    "test-final.sh", "test_po_edit.sh", "start-apex.bat",
    "C:UsersAdminDownloadsscreen.png", "render-uat.yaml", "render.yaml"
)
foreach ($f in $removeFiles) {
    $path = Join-Path $jnj $f
    if (Test-Path $path) { Remove-Item $path -Force }
}
```

- [ ] **Step 3: Initialize git repository**

```powershell
cd "C:\Users\Admin\Downloads\CLAUDE\JNJ POS"
git init
```

- [ ] **Step 4: Create .gitignore**

Create file `C:\Users\Admin\Downloads\CLAUDE\JNJ POS\.gitignore`:

```
node_modules/
dist/
.env
*.log
tmp/
.next/
.turbo/
```

- [ ] **Step 5: Initial commit**

```powershell
git add -A
git commit -m "chore: initial copy from APEX POS before strip-down"
```

---

## Task 2: Delete Removed API Modules

**Files:**
- Delete: 21 directories under `apps/api/src/modules/`
- Modify: `apps/api/src/app.ts` — remove plugin registrations

- [ ] **Step 1: Delete removed module directories**

```powershell
$modulesDir = "C:\Users\Admin\Downloads\CLAUDE\JNJ POS\apps\api\src\modules"
$removeModules = @(
    "ai-advisor", "analytics", "audit", "backorders", "cashflow",
    "dot-batches", "import", "import-history", "job-cards", "promos",
    "reorder", "returns", "serials", "shifts", "stock-monitor",
    "supplier-returns", "sync", "technicians", "transfers", "vehicles",
    "warranties"
)
foreach ($m in $removeModules) {
    $path = Join-Path $modulesDir $m
    if (Test-Path $path) { Remove-Item $path -Recurse -Force }
}
```

- [ ] **Step 2: Also delete the route-imports test file**

```powershell
Remove-Item "C:\Users\Admin\Downloads\CLAUDE\JNJ POS\apps\api\src\modules\route-imports.test.ts" -Force -ErrorAction SilentlyContinue
```

- [ ] **Step 3: Update app.ts — remove all import lines and register calls for deleted modules**

Open `apps/api/src/app.ts`. Remove every `import` statement and every `app.register(...)` call for these modules:

- ai-advisor → prefix `/ai-advisor`
- analytics → prefix `/analytics`
- audit → prefix `/audit-log`
- backorders → prefix `/procurement/backorders`
- cashflow → prefix `/cashflow`
- dot-batches → prefix `/inventory/dot-batches`
- import → prefix `/inventory/import`
- import-history → prefix `/inventory/import/history`
- job-cards → prefix `/job-cards`
- promos → prefix `/promos`
- reorder → prefix `/inventory/reorder`
- returns → prefix `/returns`
- serials → prefix `/inventory/serials`
- shifts → prefix `/shifts`
- stock-monitor → prefix `/inventory/stock-monitor`
- supplier-returns → prefix `/procurement/supplier-returns`
- sync → prefix `/sync`
- technicians → prefix `/technicians`
- transfers → prefix `/transfers`
- vehicles → prefix `/vehicles`
- warranties → prefix `/warranties`

Keep all other imports and registrations intact.

- [ ] **Step 4: Verify app.ts has no broken imports**

```powershell
cd "C:\Users\Admin\Downloads\CLAUDE\JNJ POS"
npx tsc --noEmit --project apps/api/tsconfig.json 2>&1 | Select-Object -First 30
```

Expected: may still have errors from schema deletions (Task 3), but no "module not found" for deleted API modules.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "chore: remove 21 unused API modules (automotive, finance, sync)"
```

---

## Task 3: Delete Removed Database Schemas

**Files:**
- Delete: 32 schema files under `packages/database/src/schema/`
- Modify: `packages/database/src/schema/index.ts` — remove re-exports

- [ ] **Step 1: Delete removed schema files**

```powershell
$schemaDir = "C:\Users\Admin\Downloads\CLAUDE\JNJ POS\packages\database\src\schema"
$removeSchemas = @(
    "ar-payment-allocations.ts", "audit-log.ts", "backorders.ts",
    "customer-collection-notes.ts", "customer-disputes.ts",
    "customer-payment-risk-events.ts", "customer-vehicles.ts",
    "dot-batches.ts", "historical-sales.ts", "import-profiles.ts",
    "job-card-state-log.ts", "job-cards.ts", "price-changes.ts",
    "promos.ts", "recurring-expenses.ts", "reorder.ts", "returns.ts",
    "serial-numbers.ts", "service-operations.ts", "shift-drawer-events.ts",
    "shifts.ts", "soa-records.ts", "staging.ts", "stock-metrics.ts",
    "stock-transfer-receipts.ts", "stock-transfers.ts", "supplier-returns.ts",
    "supplier-soa-records.ts", "technicians.ts", "vehicle-compatibility.ts",
    "vehicles.ts", "warranties.ts"
)
foreach ($s in $removeSchemas) {
    $path = Join-Path $schemaDir $s
    if (Test-Path $path) { Remove-Item $path -Force }
}
```

- [ ] **Step 2: Update schema/index.ts — remove all re-exports for deleted schemas**

Open `packages/database/src/schema/index.ts`. Remove every `export * from './...'` line that references a deleted file. The remaining exports should be:

```typescript
export * from './organizations'
export * from './locations'
export * from './users'
export * from './product-families'
export * from './brands'
export * from './products'
export * from './inventory'
export * from './suppliers'
export * from './stock-journal'
export * from './customers'
export * from './customer-transactions'
export * from './sales'
export * from './sale-payments'
export * from './purchase-orders'
export * from './inventory-counts'
export * from './categories'
export * from './product-subcategories'
export * from './product-options'
export * from './organization-settings'
export * from './api-keys'
export * from './product-suppliers'
export * from './accounts-payable'
export * from './tags'
export * from './notifications'
export * from './pos-devices'
export * from './rbac'
export * from './pricing-config'
export * from './printers'
export * from './discount-rules'
export * from './daily-sales-summary'
export * from './disbursement-vouchers'
```

- [ ] **Step 3: Fix cross-references in kept schema files**

Some kept schemas reference deleted ones. Search for and remove:

1. In `sales.ts`: Remove `shiftId` column reference to shifts table, remove `jobCardPartId` and `serviceOperationId` references in sale lines, remove `technicianId` reference in sale lines, remove `promoRuleId` reference in sale lines
2. In `products.ts`: Remove `isTire`, `maxTireAgeYears` columns, remove `isSerialized`, `warrantyMonths` columns, remove `commissionAmount` column
3. In `customers.ts`: Check for references to customer-vehicles, customer-disputes, etc. and remove foreign key references if any
4. In `purchase-orders.ts`: Remove any references to serial-numbers or dot-batches in PO receipt events

For each file, grep for the deleted table names and remove the import + column definition.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "chore: remove 32 unused database schemas and fix cross-references"
```

---

## Task 4: Delete Removed Web Routes & Update Sidebar

**Files:**
- Delete: 12+ route directories under `apps/web/src/app/`
- Modify: `apps/web/src/app/sidebar.tsx` — remove nav items
- Modify: `apps/web/src/app/layout.tsx` — update title

- [ ] **Step 1: Delete removed web route directories**

```powershell
$webAppDir = "C:\Users\Admin\Downloads\CLAUDE\JNJ POS\apps\web\src\app"
$removeRoutes = @(
    "admin", "analytics", "cashflow", "employees",
    "families", "integrations", "notifications",
    "promos", "returns", "service", "transfers", "warranties"
)
foreach ($r in $removeRoutes) {
    $path = Join-Path $webAppDir $r
    if (Test-Path $path) { Remove-Item $path -Recurse -Force }
}
```

- [ ] **Step 2: Clean up kept routes — remove automotive sub-pages**

```powershell
$webAppDir = "C:\Users\Admin\Downloads\CLAUDE\JNJ POS\apps\web\src\app"

# Customers: remove AR/automotive sub-pages
$custRemove = @("collections", "multi-payment", "payment-register", "soa", "soa-search", "vehicles")
foreach ($r in $custRemove) {
    $path = Join-Path "$webAppDir\customers" $r
    if (Test-Path $path) { Remove-Item $path -Recurse -Force }
}
# Keep: customers/ (list), customers/[id]/, customers/invoices/, customers/reports/

# Inventory: remove automotive sub-pages
$invRemove = @("dot-entry", "fitments", "serials", "vehicle-lookup", "import")
foreach ($r in $invRemove) {
    $path = Join-Path "$webAppDir\inventory" $r
    if (Test-Path $path) { Remove-Item $path -Recurse -Force }
}

# Procurement: remove unused sub-pages
$procRemove = @("backorders", "stock-monitor", "stock-velocity", "transfer-orders")
foreach ($r in $procRemove) {
    $path = Join-Path "$webAppDir\procurement" $r
    if (Test-Path $path) { Remove-Item $path -Recurse -Force }
}

# Reports: remove automotive reports
$repRemove = @("demand-by-tag", "mechanic-productivity")
foreach ($r in $repRemove) {
    $path = Join-Path "$webAppDir\reports" $r
    if (Test-Path $path) { Remove-Item $path -Recurse -Force }
}

# Sales: remove shifts page
$path = Join-Path "$webAppDir\sales" "shifts"
if (Test-Path $path) { Remove-Item $path -Recurse -Force }

# AP: remove advanced sub-pages
$apRemove = @("check-vouchers", "reports", "soa-history", "supplier-soa", "suppliers")
foreach ($r in $apRemove) {
    $path = Join-Path "$webAppDir\ap" $r
    if (Test-Path $path) { Remove-Item $path -Recurse -Force }
}

# Settings: remove audit-log page
$path = Join-Path "$webAppDir\settings" "audit-log"
if (Test-Path $path) { Remove-Item $path -Recurse -Force }
```

- [ ] **Step 3: Rewrite sidebar.tsx navigation**

Replace the entire navigation items array in `apps/web/src/app/sidebar.tsx` with the stripped-down JNJ POS navigation. The new nav structure:

**TOP NAVIGATION:**

1. **Dashboard** (direct link)
   - href: `/dashboard`
   - Icon: LayoutDashboard

2. **Sales** (group)
   - Receipts → `/sales/receipts`
   - Open Tickets → `/sales/open-tickets`

3. **Items** (group)
   - Item List → `/inventory` (product list page)
   - Categories → `/inventory/categories`
   - Brands → `/inventory/brands`
   - Discounts → `/inventory/discounts`
   - Barcode Printing → `/inventory/barcode-printing`
   - Tags → `/inventory/tags`

4. **Inventory** (group)
   - Stock Levels → `/procurement/stock-levels`
   - Purchase Orders → `/procurement/purchase-orders`
   - Stock Adjustments → `/procurement/stock-adjustments`
   - Inventory Counts → `/procurement/inventory-counts`
   - Inventory History → `/procurement/inventory-history`

5. **Customers** (group)
   - Customer List → `/customers`
   - Customer Invoices → `/customers/invoices`

6. **Suppliers** (group)
   - Supplier List → `/suppliers`
   - Supplier Invoices → `/ap/invoices`
   - Disbursement Vouchers → `/ap/disbursement-vouchers`

7. **Reports** (group)
   - Sales by Item → `/reports/sales-by-item`
   - Sales by Category → `/reports/sales-by-category`
   - Sales by Payment → `/reports/sales-by-payment`
   - Discount Analysis → `/reports/discount-analysis`
   - Inventory Valuation → `/reports/inventory-valuation`

**BOTTOM NAVIGATION:**

1. **Settings** (group)
   - General → `/settings`
   - Locations → `/settings/locations`
   - Company Profile → `/settings/company`
   - POS Devices → `/settings/devices`
   - Roles & Permissions → `/settings/roles`

Remove all automotive nav items: Vehicle Lookup, Serial Lookup, Tire Age Report, DOT Code Entry, Fitment Manager, Service/Job Cards, Warranty, Cash Flow, Recurring Expenses, Technicians, Stock Monitor, Stock Velocity, Backorders, Transfer Orders, Shifts, Employees, Data Health, Analytics.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "chore: remove unused web routes and update sidebar navigation"
```

---

## Task 5: Rebrand Apex → JNJ

**Files:**
- Modify: `package.json` (root)
- Modify: `apps/api/package.json`
- Modify: `apps/web/package.json`
- Modify: `apps/mobile/package.json`
- Modify: `packages/database/package.json`
- Modify: `packages/types/package.json`
- Modify: `docker-compose.yml`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: all files referencing "apex" or "APEX"

- [ ] **Step 1: Update root package.json**

In `package.json`:
- Change `"name": "apex-pos"` → `"name": "jnj-pos"`
- Change all `@apex/` references to `@jnj/` in scripts:
  - `pnpm --filter @apex/api` → `pnpm --filter @jnj/api`
  - `pnpm --filter @apex/web` → `pnpm --filter @jnj/web`
  - `pnpm --filter @apex/types` → `pnpm --filter @jnj/types`
  - `pnpm --filter @apex/database` → `pnpm --filter @jnj/database`
- Remove the `loyverse:import` script

- [ ] **Step 2: Update package names in all sub-packages**

For each package.json, change the `"name"` field:
- `apps/api/package.json`: `"@apex/api"` → `"@jnj/api"`
- `apps/web/package.json`: `"@apex/web"` → `"@jnj/web"`
- `apps/mobile/package.json`: `"@apex/mobile"` → `"@jnj/mobile"`
- `packages/database/package.json`: `"@apex/database"` → `"@jnj/database"`
- `packages/types/package.json`: `"@apex/types"` → `"@jnj/types"`

Also update all `"dependencies"` that reference `"@apex/types": "workspace:*"` or `"@apex/database": "workspace:*"` to use `@jnj/`.

- [ ] **Step 3: Find and replace @apex/ → @jnj/ in all source files**

```powershell
cd "C:\Users\Admin\Downloads\CLAUDE\JNJ POS"
# Find all .ts and .tsx files referencing @apex/
Get-ChildItem -Path . -Include "*.ts","*.tsx" -Recurse -File |
    Where-Object { $_.FullName -notmatch "node_modules" } |
    ForEach-Object {
        $content = Get-Content $_.FullName -Raw -Encoding utf8
        if ($content -match "@apex/") {
            $content = $content -replace "@apex/", "@jnj/"
            Set-Content $_.FullName $content -Encoding utf8 -NoNewline
        }
    }
```

- [ ] **Step 4: Update docker-compose.yml**

Change:
- `container_name: apex-postgres` → `container_name: jnj-postgres`
- `POSTGRES_USER: apex` → `POSTGRES_USER: jnj`
- `POSTGRES_PASSWORD: apex_secret` → `POSTGRES_PASSWORD: jnj_secret`
- `POSTGRES_DB: apex_dev` → `POSTGRES_DB: jnj_dev`
- health check: `pg_isready -U apex -d apex_dev` → `pg_isready -U jnj -d jnj_dev`

- [ ] **Step 5: Update web app title**

In `apps/web/src/app/layout.tsx`:
- Title: `"CBROS Genuine Autoparts — Admin"` → `"JNJ POS"`
- Description: `"Automotive ERP & POS Administration"` → `"School Supply & Merchandise POS"`

- [ ] **Step 6: Update sidebar header/logo text**

In `apps/web/src/app/sidebar.tsx`:
- Any text showing "Apex" or "CBROS" → `"JNJ POS"`

- [ ] **Step 7: Create start-jnj.bat**

Create `start-jnj.bat`:

```bat
@echo off
echo Starting JNJ POS...
docker compose up -d
timeout /t 3
pnpm dev
```

- [ ] **Step 8: Bulk rename any remaining "apex" references in source**

```powershell
cd "C:\Users\Admin\Downloads\CLAUDE\JNJ POS"
Get-ChildItem -Path . -Include "*.ts","*.tsx","*.json","*.yml","*.yaml","*.md","*.bat" -Recurse -File |
    Where-Object { $_.FullName -notmatch "node_modules|pnpm-lock|\.git" } |
    ForEach-Object {
        $content = Get-Content $_.FullName -Raw -Encoding utf8
        if ($content -match "(?i)apex") {
            $newContent = $content -replace "apex-pos", "jnj-pos"
            $newContent = $newContent -replace "apex_pos", "jnj_pos"
            $newContent = $newContent -replace "APEX_POS", "JNJ_POS"
            $newContent = $newContent -replace "Apex POS", "JNJ POS"
            $newContent = $newContent -replace "APEX POS", "JNJ POS"
            $newContent = $newContent -replace "apex-postgres", "jnj-postgres"
            $newContent = $newContent -replace "apex_dev", "jnj_dev"
            $newContent = $newContent -replace "apex_secret", "jnj_secret"
            $newContent = $newContent -replace "admin@apex\.com", "admin@jnj.com"
            # Don't replace "apex" in generic contexts — only known patterns
            if ($newContent -ne $content) {
                Set-Content $_.FullName $newContent -Encoding utf8 -NoNewline
            }
        }
    }
```

- [ ] **Step 9: Commit**

```powershell
git add -A
git commit -m "chore: rebrand Apex POS → JNJ POS across all packages"
```

---

## Task 6: Apply Professional Blue Color Scheme

**Files:**
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Replace the CSS theme variables in globals.css**

Open `apps/web/src/app/globals.css` and replace the entire `:root` / `@theme` color block with:

```css
@theme {
  --color-background: #F8FAFC;
  --color-foreground: #0F172A;
  --color-muted: #F1F5F9;
  --color-muted-foreground: #64748B;
  --color-border: #E2E8F0;
  --color-ring: #3B82F6;

  --color-primary: #1E40AF;
  --color-primary-foreground: #FFFFFF;

  --color-accent: #DBEAFE;
  --color-accent-foreground: #1E3A8A;

  --color-destructive: #DC2626;
  --color-success: #16A34A;
  --color-warning: #D97706;

  --color-sidebar: #0F172A;
  --color-sidebar-foreground: #94A3B8;
  --color-sidebar-foreground-active: #F8FAFC;
  --color-sidebar-accent: #1E293B;
  --color-sidebar-border: #1E293B;
  --color-sidebar-muted: #64748B;
}
```

- [ ] **Step 2: Update body background gradient**

Replace the body background styles. Remove the warm amber radial gradient and replace with a clean slate:

```css
body {
  background: #F8FAFC;
  color: #0F172A;
}
```

- [ ] **Step 3: Update .erp-shell-bg class**

Replace the warm grid pattern with a subtle blue-tinted version:

```css
.erp-shell-bg {
  background:
    radial-gradient(ellipse 60% 40% at 10% 0%, rgba(59, 130, 246, 0.04), transparent 70%),
    linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 50%, #F8FAFC 100%);
}
```

- [ ] **Step 4: Update .surface-card class**

```css
.surface-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
  border: 1px solid #E2E8F0;
  border-radius: 0.5rem;
}
```

- [ ] **Step 5: Update scrollbar colors**

Replace warm tan scrollbar with slate:

```css
::-webkit-scrollbar-thumb {
  background: #CBD5E1;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94A3B8;
}
```

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "style: apply professional blue color scheme"
```

---

## Task 7: Update Enums & Types for Retail

**Files:**
- Modify: `packages/types/src/enums.ts`
- Modify: `packages/types/src/schemas.ts`

- [ ] **Step 1: Replace ProductCategory enum**

In `packages/types/src/enums.ts`, replace:

```typescript
// Old automotive categories
export enum ProductCategory {
  TIRES = 'TIRES',
  LUBRICANTS = 'LUBRICANTS',
  HARD_PARTS = 'HARD_PARTS',
  ACCESSORIES = 'ACCESSORIES',
  LABOR_SERVICES = 'LABOR_SERVICES',
}
```

With:

```typescript
export enum ProductCategory {
  SCHOOL_SUPPLIES = 'SCHOOL_SUPPLIES',
  OFFICE_SUPPLIES = 'OFFICE_SUPPLIES',
  ART_SUPPLIES = 'ART_SUPPLIES',
  GENERAL_MERCHANDISE = 'GENERAL_MERCHANDISE',
  BAGS_ACCESSORIES = 'BAGS_ACCESSORIES',
  ELECTRONICS = 'ELECTRONICS',
  OTHER = 'OTHER',
}
```

- [ ] **Step 2: Clean up JournalReferenceType**

Remove automotive-specific journal types:

```typescript
// Remove these values:
JOB_CARD_ISSUE = 'JOB_CARD_ISSUE',
JOB_CARD_RETURN = 'JOB_CARD_RETURN',
SUPPLIER_RETURN = 'SUPPLIER_RETURN',
SUPPLIER_RETURN_CANCEL = 'SUPPLIER_RETURN_CANCEL',
```

Keep: SALE, RECEIVING, ADJUSTMENT, RETURN, STOCKTAKE, VOID, OPENING_BALANCE, TRANSFER_IN, TRANSFER_OUT

- [ ] **Step 3: Remove unused enums**

Delete these entire enums from enums.ts:
- `TransferStatus`
- `JobCardStatus`
- `SupplierReturnStatus`
- `BackorderStatus`

Remove these arrays:
- `SERVICE_ROLES`
- `JOB_CARD_TRANSITIONS`
- `TRANSFER_TRANSITIONS`

Remove automotive adjustment reason codes:
- `DAMAGE_IN_TRANSIT` (keep `DAMAGE_WAREHOUSE` → rename to just `DAMAGED`)
- `WARRANTY_WRITE_OFF`
- `TRANSFER_SHORTAGE_CONFIRMED`

- [ ] **Step 4: Remove unused Zod schemas from schemas.ts**

In `packages/types/src/schemas.ts`, remove:
- All transfer schemas (`createTransferSchema`, `approveTransferSchema`, `dispatchTransferSchema`, `receiveTransferSchema`, `reportVarianceSchema`)
- All job card schemas (`createJobCardSchema`, `checkInJobCardSchema`, `addLaborSchema`, `addPartsSchema`, `issuePartsSchema`, `returnPartsSchema`, `approveJobCardSchema`, `transitionJobCardSchema`)
- `createReturnSchema`
- `createSupplierReturnSchema`

Remove vehicle fitment filters from `listProductsQuerySchema` (make, model, year, engine fields).

Remove serial number and DOT batch support from `createSaleSchema` and `receivePOSchema`.

- [ ] **Step 5: Add selling unit enum**

Add to enums.ts:

```typescript
export enum SellingUnit {
  PIECE = 'piece',
  CASE = 'case',
}
```

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "chore: update enums and schemas for retail domain"
```

---

## Task 8: Add UoM Fields to Products Schema

**Files:**
- Modify: `packages/database/src/schema/products.ts`

- [ ] **Step 1: Add sellingUnit and piecesPerCase columns**

In `packages/database/src/schema/products.ts`, add two new columns to the products table definition:

```typescript
sellingUnit: varchar('selling_unit', { length: 20 }).default('piece').notNull(),
piecesPerCase: integer('pieces_per_case').default(1).notNull(),
```

Place these after the existing `costPrice` / `currentCostPrice` fields.

- [ ] **Step 2: Remove automotive-specific columns from products**

Remove these columns from the products table:
- `isTire` (boolean)
- `maxTireAgeYears` (integer)
- `isSerialized` (boolean)
- `warrantyMonths` (integer)
- `commissionAmount` (numeric)

Also remove any indexes on these columns.

- [ ] **Step 3: Verify existing conversionFactor is kept**

The products table already has `purchaseUnit` and `conversionFactor` columns used for procurement. Keep these — they work in tandem:
- `purchaseUnit` = the unit suppliers sell in (e.g., "case", "box", "dozen")
- `conversionFactor` = how many base units per purchase unit
- `sellingUnit` = the base unit label (e.g., "piece", "pc", "unit")
- `piecesPerCase` = how many selling units per case for POS case/piece toggle

When `conversionFactor` and `piecesPerCase` are the same value (common case), the system is consistent end-to-end.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "feat: add sellingUnit and piecesPerCase to products schema"
```

---

## Task 9: Create Price Tiers Table

**Files:**
- Create: `packages/database/src/schema/price-tiers.ts`
- Modify: `packages/database/src/schema/index.ts`

- [ ] **Step 1: Create price-tiers.ts schema file**

Create `packages/database/src/schema/price-tiers.ts`:

```typescript
import { pgTable, uuid, integer, numeric, varchar, timestamp, unique } from 'drizzle-orm/pg-core'
import { products } from './products'
import { organizations } from './organizations'

export const priceTiers = pgTable('price_tiers', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 50 }),
  minQty: integer('min_qty').notNull(),
  maxQty: integer('max_qty'),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  casePrice: numeric('case_price', { precision: 12, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('uq_price_tier_product_org_min').on(table.productId, table.orgId, table.minQty),
])
```

- [ ] **Step 2: Add export to schema/index.ts**

Add to `packages/database/src/schema/index.ts`:

```typescript
export * from './price-tiers'
```

- [ ] **Step 3: Commit**

```powershell
git add -A
git commit -m "feat: add price_tiers table for tiered pricing"
```

---

## Task 10: Add Unit Field to Sale Lines

**Files:**
- Modify: `packages/database/src/schema/sales.ts`

- [ ] **Step 1: Add unit and piecesEquivalent columns to sale lines**

In `packages/database/src/schema/sales.ts`, add to the sale lines table:

```typescript
unit: varchar('unit', { length: 10 }).default('piece').notNull(),
piecesEquivalent: integer('pieces_equivalent'),
```

`piecesEquivalent` stores the computed total pieces for inventory deduction (e.g., qty=2 + unit=case + piecesPerCase=24 → piecesEquivalent=48). Storing this avoids recalculating during reports.

- [ ] **Step 2: Remove automotive columns from sale lines**

Remove from sale lines:
- `jobCardPartId` (reference to job cards)
- `serviceOperationId` (reference to service operations)
- `promoRuleId` (reference to promos)
- `technicianId` (reference to technicians)

- [ ] **Step 3: Remove shiftId from sales table**

Remove the `shiftId` column and its foreign key reference to the (now deleted) shifts table.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "feat: add unit/piecesEquivalent to sale lines, remove automotive refs"
```

---

## Task 11: Add Unit Field to PO Lines

**Files:**
- Modify: `packages/database/src/schema/purchase-orders.ts`

- [ ] **Step 1: Verify PO lines already have unit and conversionFactor**

The PO lines table already has `unit` and `poConversionFactor` snapshot fields. Verify these exist and work for our case/piece model:
- `unit` = 'case' or 'piece' (VARCHAR)
- `poConversionFactor` = pieces per unit at time of PO creation

If these fields exist and are correct, no changes needed. Just verify.

- [ ] **Step 2: Remove serial number and DOT batch references from PO receipt events**

In the PO receipt events table, remove any columns referencing serial numbers or DOT batches.

- [ ] **Step 3: Commit (if changes were made)**

```powershell
git add -A
git commit -m "chore: clean PO schema of automotive references"
```

---

## Task 12: Generate Drizzle Migration

**Files:**
- Generated: `packages/database/migrations/XXXX_*.sql`

- [ ] **Step 1: Create .env file at monorepo root**

Create `C:\Users\Admin\Downloads\CLAUDE\JNJ POS\.env`:

```env
DATABASE_URL=postgresql://jnj:jnj_secret@localhost:5433/jnj_dev
JWT_SECRET=jnj-dev-secret-change-in-prod
PORT=3000
```

- [ ] **Step 2: Start Docker PostgreSQL**

```powershell
cd "C:\Users\Admin\Downloads\CLAUDE\JNJ POS"
docker compose up -d
```

Wait for health check to pass.

- [ ] **Step 3: Install dependencies**

```powershell
cd "C:\Users\Admin\Downloads\CLAUDE\JNJ POS"
pnpm install
```

- [ ] **Step 4: Generate fresh migration from current schema**

Since we've heavily modified the schema, delete any existing APEX migrations and generate fresh:

```powershell
# Remove old APEX migrations
Remove-Item "C:\Users\Admin\Downloads\CLAUDE\JNJ POS\packages\database\migrations\*" -Recurse -Force -ErrorAction SilentlyContinue

# Generate new migration
cd "C:\Users\Admin\Downloads\CLAUDE\JNJ POS"
pnpm db:generate
```

- [ ] **Step 5: Run migration**

```powershell
pnpm db:migrate
```

Expected: Tables created successfully in jnj_dev database.

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "feat: generate fresh Drizzle migration for JNJ POS schema"
```

---

## Task 13: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Rewrite CLAUDE.md for JNJ POS**

Replace the contents of `CLAUDE.md` with:

```markdown
# JNJ POS — School Supply & Merchandise POS

## Project Structure
pnpm monorepo with 3 apps + 2 shared packages:
- `apps/api` — Fastify 5 modular monolith (backend)
- `apps/web` — Next.js 15 admin & POS frontend
- `apps/mobile` — React Native mobile app
- `packages/database` — Drizzle ORM schema, migrations, seed
- `packages/types` — Shared enums, Zod schemas, TS interfaces

## Commands
- `pnpm dev` — Start API dev server (port 3000)
- `pnpm web:dev` — Start web frontend (port 3001)
- `pnpm build` — Build all packages for production
- `pnpm db:generate` — Generate Drizzle migrations from schema changes
- `pnpm db:migrate` — Run pending migrations against Postgres
- `pnpm db:seed` — Seed sample products
- `pnpm db:studio` — Open Drizzle Studio for DB exploration
- `docker compose up -d` — Start local Postgres (port 5433)

## Architecture
- **Multi-tenant:** Shared DB, every query filtered by `org_id`
- **Store-context:** `X-Location-ID` header required on all data routes
- **Auth:** JWT via `@fastify/jwt`
- **Pagination:** Keyset cursor-based (`?cursor=<uuid>&limit=50`)

## Domain Model
- **Case/Piece selling:** Products have `piecesPerCase` (conversion factor). POS sells by piece or case.
- **Tiered pricing:** `price_tiers` table with min/max qty thresholds per product.
- **Inventory:** Always stored in base unit (pieces). Display shows "120 pcs (5 cases)".
- **Procurement:** POs default to case quantities. Receiving converts to base units.

## Key Files
- `apps/api/src/app.ts` — Plugin registration
- `apps/api/src/plugins/auth.ts` — JWT auth
- `apps/api/src/plugins/store-context.ts` — Location context
- `packages/database/src/schema/` — One file per table
- `packages/database/src/schema/price-tiers.ts` — Tiered pricing
- `packages/types/src/enums.ts` — Domain enums
- `packages/types/src/schemas.ts` — Zod validation

## Database
- PostgreSQL 16 (Docker on port 5433)
- Drizzle ORM with postgres driver
- Docker: user=jnj, password=jnj_secret, db=jnj_dev
- Seed admin: admin@jnj.com / admin12345

## Environment
- `.env` at monorepo root (not in packages)
- `DATABASE_URL=postgresql://jnj:jnj_secret@localhost:5433/jnj_dev`

## Color Scheme
Professional blue: primary #1E40AF, accent #3B82F6, sidebar #0F172A, background #F8FAFC
```

- [ ] **Step 2: Commit**

```powershell
git add -A
git commit -m "docs: rewrite CLAUDE.md for JNJ POS"
```

---

## Task 14: Fix Remaining Cross-References & Type Errors

**Files:**
- Various files with broken imports after module deletions

- [ ] **Step 1: Run full typecheck to find remaining errors**

```powershell
cd "C:\Users\Admin\Downloads\CLAUDE\JNJ POS"
pnpm typecheck 2>&1 | Select-Object -First 80
```

- [ ] **Step 2: Fix each type error**

Common fixes:
- Remove imports of deleted schemas/types in kept modules
- Remove references to deleted enums (JobCardStatus, TransferStatus, etc.)
- Remove vehicle-related fields from product query handlers
- Remove shift references from sales module
- Remove serial/DOT batch handling from PO receiving logic
- Remove promo/technician references from sales service

Work through each error, fixing the import or removing the dead code reference.

- [ ] **Step 3: Re-run typecheck until clean**

```powershell
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "fix: resolve all type errors from module removal"
```

---

## Task 15: Verify Build & Startup

**Files:** None (verification only)

- [ ] **Step 1: Build all packages**

```powershell
cd "C:\Users\Admin\Downloads\CLAUDE\JNJ POS"
pnpm build
```

Expected: All packages build successfully.

- [ ] **Step 2: Start API server**

```powershell
pnpm dev
```

Expected: Fastify server starts on port 3000 with no errors.

- [ ] **Step 3: Hit health endpoint**

```powershell
Invoke-RestMethod -Uri http://localhost:3000/health
```

Expected: `{ "status": "ok" }` or similar.

- [ ] **Step 4: Start web frontend**

```powershell
pnpm web:dev
```

Expected: Next.js dev server starts on port 3001.

- [ ] **Step 5: Verify web app loads in browser**

Open `http://localhost:3001` — should show JNJ POS login page with:
- Blue color scheme (dark sidebar, slate background)
- "JNJ POS" branding
- No references to "Apex", "CBROS", or automotive terms

- [ ] **Step 6: Final commit**

```powershell
git add -A
git commit -m "chore: JNJ POS v1.0 — stripped, rebranded, restyled"
```

---

## Summary

| Task | Description | Estimated Time |
|------|-------------|---------------|
| 1 | Copy & git init | 5 min |
| 2 | Delete API modules + update app.ts | 15 min |
| 3 | Delete DB schemas + update index.ts | 15 min |
| 4 | Delete web routes + update sidebar | 15 min |
| 5 | Rebrand Apex → JNJ | 10 min |
| 6 | Blue color scheme | 5 min |
| 7 | Update enums/types for retail | 10 min |
| 8 | Add UoM fields to products | 5 min |
| 9 | Create price_tiers table | 5 min |
| 10 | Add unit to sale lines | 5 min |
| 11 | Clean PO schema | 5 min |
| 12 | Generate migration & run | 10 min |
| 13 | Rewrite CLAUDE.md | 5 min |
| 14 | Fix cross-references & type errors | 20 min |
| 15 | Build & verify | 10 min |
| **Total** | | **~2.5 hours** |
