import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { healthRoutes } from "./modules/health/routes";
import { authRoutes } from "./modules/auth/routes";
import { authPlugin } from "./plugins/auth";
import { storeContextPlugin } from "./plugins/store-context";
import { productRoutes } from "./modules/products/routes";
import { adjustmentRoutes } from "./modules/adjustments/routes";
import { salesRoutes } from "./modules/sales/routes";
import { customerRoutes } from "./modules/customers/routes";
import { procurementRoutes } from "./modules/procurement/routes";
import { reportingRoutes } from "./modules/reporting/routes";
import { stockJournalRoutes } from "./modules/stock-journal/routes";
import { stockLevelsRoutes } from "./modules/stock-levels/routes";
import { inventoryCountRoutes } from "./modules/inventory-counts/routes";
import { categoryRoutes } from "./modules/categories/routes";
import { productOptionsRoutes } from "./modules/product-options/routes";
import { variantRoutes } from "./modules/variants/routes";
import { locationRoutes } from "./modules/locations/routes";
import { dashboardRoutes } from "./modules/dashboard/routes";
import { brandRoutes } from "./modules/brands/routes";
import { settingsRoutes } from "./modules/settings/routes";
import { catalogRoutes } from "./modules/catalog/routes";
import { pricingRoutes } from "./modules/pricing/routes";
import { productSuppliersRoutes } from "./modules/product-suppliers/routes";
import { accountsPayableRoutes } from "./modules/accounts-payable/routes";
import { tagRoutes } from "./modules/tags/routes";
import { notificationRoutes } from "./modules/notifications/routes";
import { deviceRoutes } from "./modules/devices/routes";
import { rbacRoutes } from "./modules/rbac/routes";
import { printingRoutes } from "./modules/printing/routes";
import discountRoutes from "./modules/discounts/routes";

const DEFAULT_PRODUCTION_CORS_ORIGINS = ["https://jeffnjulie.up.railway.app"];

function getCorsOrigin() {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const configuredOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map(s => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);

  return configuredOrigins.length > 0
    ? configuredOrigins
    : DEFAULT_PRODUCTION_CORS_ORIGINS;
}

export async function buildApp(): Promise<FastifyInstance> {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
  }

  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
    },
    bodyLimit: 50 * 1024 * 1024, // 50 MB — needed for large CSV imports
  });

  // ── Global plugins ──
  await app.register(cors, {
    origin: getCorsOrigin(),
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
  await app.register(sensible);
  await app.register(rateLimit, {
    max: 500,
    timeWindow: "1 minute",
    keyGenerator: (request) => request.ip,
  });
  await app.register(jwt, { secret: JWT_SECRET });

  // ── Custom plugins ──
  await app.register(authPlugin);
  await app.register(storeContextPlugin);

  // ── Routes ──
  await app.register(healthRoutes, { prefix: "/health" });
  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(productRoutes, { prefix: "/products" });
  await app.register(adjustmentRoutes, { prefix: "/inventory/adjustments" });
  await app.register(salesRoutes, { prefix: "/sales" });
  await app.register(customerRoutes, { prefix: "/customers" });
  await app.register(procurementRoutes, { prefix: "/procurement" });
  await app.register(reportingRoutes, { prefix: "/reports" });
  await app.register(stockJournalRoutes, { prefix: "/inventory/journal" });
  await app.register(stockLevelsRoutes, { prefix: "/inventory/stock-levels" });
  await app.register(inventoryCountRoutes, { prefix: "/inventory/counts" });
  await app.register(categoryRoutes, { prefix: "/categories" });
  await app.register(productOptionsRoutes, { prefix: "/product-options" });
  await app.register(variantRoutes, { prefix: "/variants" });
  await app.register(locationRoutes, { prefix: "/locations" });
  await app.register(dashboardRoutes, { prefix: "/dashboard" });
  await app.register(brandRoutes, { prefix: "/brands" });
  await app.register(settingsRoutes, { prefix: "/settings" });
  await app.register(catalogRoutes, { prefix: "/api/v1/catalog" });
  await app.register(pricingRoutes, { prefix: "/inventory/pricing" });
  await app.register(productSuppliersRoutes, { prefix: "/products" });
  await app.register(accountsPayableRoutes, { prefix: "/ap" });
  await app.register(tagRoutes, { prefix: "/tags" });
  await app.register(notificationRoutes, { prefix: "/notifications" });
  await app.register(deviceRoutes, { prefix: "/devices" });
  await app.register(rbacRoutes, { prefix: "/rbac" });
  await app.register(printingRoutes, { prefix: "/printing" });
  await app.register(discountRoutes, { prefix: "/discounts" });

  return app;
}
