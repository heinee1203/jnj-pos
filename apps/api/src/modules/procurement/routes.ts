import type { FastifyPluginAsync } from "fastify";
import { registerProcurementAuxiliaryRoutes } from "./procurement-auxiliary-routes";
import { registerPurchaseOrderCoreRoutes } from "./purchase-order-core-routes";
import { registerPurchaseOrderEditRoutes } from "./purchase-order-edit-routes";
import { registerPurchaseOrderLifecycleRoutes } from "./purchase-order-lifecycle-routes";
import { registerSupplierReturnRoutes } from "./supplier-return-routes";
import { registerProcurementSupplierRoutes } from "./supplier-routes";

export const procurementRoutes: FastifyPluginAsync = async (app) => {
  registerProcurementSupplierRoutes(app);
  registerSupplierReturnRoutes(app);
  registerPurchaseOrderCoreRoutes(app);
  registerPurchaseOrderLifecycleRoutes(app);
  registerPurchaseOrderEditRoutes(app);
  registerProcurementAuxiliaryRoutes(app);
};
