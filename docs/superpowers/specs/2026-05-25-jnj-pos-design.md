# JNJ POS — Design Spec

**Date:** 2026-05-25
**Source:** Fork of APEX POS (Automotive ERP) → stripped to general retail POS
**Target:** School supply & general merchandise store

---

## 1. Business Context

JNJ POS serves a school supply and general merchandise store. Stock arrives in **boxes/cases** from suppliers and is sold either **by case or by piece** at the retail counter. Pricing is **tiered** — the unit price changes based on quantity purchased (e.g., 1-11 pcs at full price, 12+ at a discount, full case at a bulk rate).

This drives three domain-specific requirements that APEX POS does not currently handle:

1. **Unit-of-measure (UoM) system** — every product has a base unit (piece) and a case unit with a conversion factor (e.g., 1 case = 24 pieces)
2. **Case/piece selling** — POS line items specify whether the customer is buying cases or pieces; inventory deducts accordingly
3. **Tiered pricing** — price breaks by quantity threshold, not just a single retail price

---

## 2. Features Kept from APEX POS

### Core POS & Sales
- **Sales module** — POS transaction flow: add items, apply discounts, accept payment, print receipt
- **Sale payments** — cash, card, or split payment
- **Daily sales summary** — end-of-day totals
- **Discounts** — item-level and receipt-level discounts
- **Pricing** — enhanced with tiered pricing (see Section 4)

### Products & Catalog
- **Products** — master product list with SKU, name, barcode, cost, base price
- **Categories / Subcategories** — two-level categorization (e.g., "Writing Instruments > Pens")
- **Brands** — brand management
- **Tags** — flexible tagging for filtering/search
- **Variants** — size/color variants of a product
- **Product options** — additional option groups

### Inventory
- **Stock levels** — per-location quantity tracking (in base unit: pieces)
- **Adjustments** — manual stock corrections with reason codes
- **Inventory counts** — physical count reconciliation
- **Stock journal** — audit trail of all stock movements

### Customers
- **Customer management** — name, contact, purchase history
- **Customer transactions** — linked sale history

### Procurement
- **Suppliers** — supplier directory
- **Product-suppliers** — which supplier provides which product, at what cost
- **Purchase orders** — create PO (in case quantities), receive stock, update inventory

### Accounts Payable (basic)
- **AP tracking** — supplier invoice tracking
- **Disbursement vouchers** — payment recording

### Dashboard & Reporting
- **Dashboard** — today's sales, top products, low stock alerts
- **Reporting** — sales by date range, by category, by product; inventory valuation

### Infrastructure
- **Auth** — JWT login, registration
- **RBAC** — role-based access (admin, cashier, manager)
- **Settings** — org settings, store info
- **Locations** — multi-store support
- **Devices** — POS terminal registration
- **Printing** — receipt and barcode label printing
- **Health** — API health check
- **Notifications** — low stock alerts, system notifications (backend only, no dedicated page)

---

## 3. Features Removed

All automotive-specific and advanced ERP modules are deleted:

| Removed Module | Reason |
|---|---|
| ai-advisor | Not needed for basic POS |
| analytics (complex) | Dashboard + basic reports sufficient |
| audit | Overkill for single-store retail |
| backorders | Not needed — procurement covers ordering |
| cashflow | Advanced finance, not needed |
| dot-batches | Automotive-specific (tire DOT codes) |
| import / import-history | Can add later if needed |
| job-cards | Automotive service workshop |
| promos | Complex promo engine — basic discounts sufficient |
| reorder | Auto-reorder — manual PO creation sufficient |
| returns | Can add later as Phase 2 |
| serials | Serial number tracking — not needed for school supplies |
| shifts | Shift management — not needed initially |
| stock-monitor | Advanced alerts — dashboard low-stock sufficient |
| supplier-returns | Can add later |
| sync | Offline sync — not needed initially |
| technicians | Automotive service |
| transfers | Multi-warehouse transfers — single store initially |
| vehicles | Automotive vehicle lookup |
| warranties | Automotive warranties |

### DB Tables Removed

vehicles, vehicle-compatibility, warranties, job-cards, job-card-state-log, technicians, service-operations, serial-numbers, stock-transfers, stock-transfer-receipts, supplier-returns, supplier-soa-records, soa-records, backorders, recurring-expenses, customer-vehicles, customer-disputes, customer-collection-notes, customer-payment-risk-events, dot-batches, historical-sales, staging, stock-metrics, shifts, shift-drawer-events, reorder, ar-payment-allocations, promos, price-changes, import-profiles, audit-log

### Web Routes Removed

`/service`, `/warranties`, `/transfers`, `/returns`, `/cashflow`, `/analytics`, `/employees`, `/families`, `/integrations`, `/promos`

---

## 4. New/Modified Features

### 4.1 Unit of Measure (UoM) System

Every product gets two new fields on the `products` table:

```
selling_unit   VARCHAR(20)  DEFAULT 'piece'   -- base selling unit label
pieces_per_case INTEGER     DEFAULT 1          -- conversion factor (1 = no case unit)
```

- When `pieces_per_case = 1`, the product is sold only by piece (e.g., a single notebook)
- When `pieces_per_case > 1`, the product can be sold by piece OR by case (e.g., a box of 12 pens)
- Inventory is always stored in the **base unit (pieces)**
- Display shows both: "120 pcs (5 cases)" when `pieces_per_case = 24`

### 4.2 Case/Piece Selling at POS

Sale line items gain a `unit` field:

```
sale_items.unit   VARCHAR(10) DEFAULT 'piece'  -- 'piece' or 'case'
sale_items.qty    NUMERIC                       -- quantity in the selected unit
```

When a cashier adds an item:
1. If the product has `pieces_per_case > 1`, the POS shows a toggle: **Piece | Case**
2. Selecting "Case" multiplies the deduction: `qty * pieces_per_case` deducted from inventory
3. The receipt shows: "Ballpen Blue x2 cases (24 pcs) @ P50.00/case = P100.00"

### 4.3 Tiered Pricing

New table `price_tiers`:

```sql
price_tiers
  id              UUID PRIMARY KEY
  product_id      UUID REFERENCES products(id)
  org_id          UUID REFERENCES organizations(id)
  min_qty         INTEGER NOT NULL        -- minimum quantity (in pieces)
  max_qty         INTEGER                 -- null = unlimited
  unit_price      NUMERIC(12,2) NOT NULL  -- price per piece at this tier
  case_price      NUMERIC(12,2)           -- price per case at this tier (optional)
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ

  UNIQUE(product_id, org_id, min_qty)    -- no overlapping tiers per product
```

Example for "Ballpen Blue" (24 pcs/case):

| Tier | Min Qty | Max Qty | Price/Piece | Price/Case |
|------|---------|---------|-------------|------------|
| Retail | 1 | 11 | 5.00 | — |
| Dozen | 12 | 23 | 4.50 | — |
| Case | 24 | null | 4.00 | 90.00 |

Price resolution logic:
1. Calculate total pieces (qty * pieces_per_case if selling by case)
2. Find the matching tier by total piece count
3. If selling by case and `case_price` is set, use `case_price`; otherwise use `unit_price * pieces_per_case`

### 4.4 Purchase Orders in Cases

PO line items default to **case** quantities for procurement:

```
po_items.unit           VARCHAR(10) DEFAULT 'case'
po_items.qty            NUMERIC  -- in the selected unit
po_items.cost_per_unit  NUMERIC  -- cost per case or per piece
```

When stock is received, inventory is updated in base units:
- Received 5 cases of 24 = +120 pieces added to inventory

---

## 5. Rebranding

| What | From | To |
|------|------|-----|
| Package names | `@apex/*` | `@jnj/*` |
| App title | "Apex POS" | "JNJ POS" |
| Docker DB | `apex_dev` | `jnj_dev` |
| Seed admin email | `admin@apex.com` | `admin@jnj.com` |
| Monorepo name | `apex-pos` | `jnj-pos` |
| CLAUDE.md header | "Apex POS — Automotive ERP" | "JNJ POS — School Supply & Merchandise POS" |

---

## 6. Color Scheme — Professional Blue

Applied via Tailwind CSS theme configuration.

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#1E40AF` (blue-800) | Nav bar, primary buttons, active states |
| `primary-hover` | `#1E3A8A` (blue-900) | Button hover states |
| `accent` | `#3B82F6` (blue-500) | Links, highlights, badges |
| `accent-light` | `#DBEAFE` (blue-100) | Selected row backgrounds, light accents |
| `bg-main` | `#F8FAFC` (slate-50) | Page background |
| `bg-card` | `#FFFFFF` | Card/panel backgrounds |
| `sidebar-bg` | `#0F172A` (slate-900) | Sidebar background |
| `sidebar-text` | `#F8FAFC` (slate-50) | Sidebar text |
| `sidebar-active` | `#1E40AF` (blue-800) | Active sidebar item |
| `text-primary` | `#0F172A` (slate-900) | Headings, primary text |
| `text-secondary` | `#64748B` (slate-500) | Descriptions, secondary text |
| `border` | `#E2E8F0` (slate-200) | Card borders, dividers |
| `success` | `#16A34A` (green-600) | Success states, positive numbers |
| `error` | `#DC2626` (red-600) | Errors, negative numbers, low stock |
| `warning` | `#D97706` (amber-600) | Warnings, approaching thresholds |

---

## 7. Tech Stack (unchanged from APEX)

- **Monorepo:** pnpm workspaces
- **API:** Fastify 5, modular monolith
- **Web:** Next.js 15, React 19, Tailwind CSS 4, TanStack Query
- **Mobile:** React Native (kept but not modified in this phase)
- **Database:** PostgreSQL 16, Drizzle ORM
- **Auth:** JWT via @fastify/jwt
- **Architecture:** Multi-tenant (org_id), store-context (X-Location-ID)

---

## 8. Scope Boundary

**In scope (this spec):**
- Copy APEX POS → JNJ POS directory
- Delete removed modules, schemas, routes, web pages
- Add UoM fields to products table
- Add price_tiers table
- Modify sale line items for case/piece unit
- Modify PO line items for case quantities
- Rebrand all references
- Apply blue color scheme
- Update CLAUDE.md

**Out of scope (future phases):**
- Returns module
- Shift management
- Barcode scanner integration
- Offline/sync mode
- Mobile app customization
- Multi-store transfers
- Loyalty program
