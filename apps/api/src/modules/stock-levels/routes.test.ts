import assert from "node:assert/strict";
import test from "node:test";

type RegisteredRoute = {
  method: "get" | "patch";
  path: string;
};

function createRouteRecorder() {
  const routes: RegisteredRoute[] = [];
  const app = {
    get(path: string) {
      routes.push({ method: "get", path });
    },
    patch(path: string) {
      routes.push({ method: "patch", path });
    },
  };

  return { app, routes };
}

test("stock level route registration preserves public endpoint order", async () => {
  process.env.DATABASE_URL ??= "postgres://jnj:jnj@localhost:5432/jnj_test";
  const { stockLevelsRoutes } = await import("./routes");
  const { app, routes } = createRouteRecorder();

  await stockLevelsRoutes(app as any, {} as any);

  assert.deepEqual(routes, [
    { method: "get", path: "/" },
    { method: "get", path: "/product/:productId/locations" },
    { method: "patch", path: "/availability" },
    { method: "patch", path: "/reorder-point" },
  ]);
});
