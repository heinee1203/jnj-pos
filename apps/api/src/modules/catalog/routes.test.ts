import assert from "node:assert/strict";
import test from "node:test";

type RegisteredRoute = {
  method: "get";
  path: string;
};

function createRouteRecorder() {
  const routes: RegisteredRoute[] = [];
  const app = {
    addHook() {
      // Hook registration is part of the plugin contract but not a public route.
    },
    get(path: string) {
      routes.push({ method: "get", path });
    },
  };

  return { app, routes };
}

test("catalog route registration preserves public endpoint order", async () => {
  process.env.DATABASE_URL ??= "postgres://jnj:jnj@localhost:5432/jnj_test";
  const { catalogRoutes } = await import("./routes");
  const { app, routes } = createRouteRecorder();

  await catalogRoutes(app as any, {} as any);

  assert.deepEqual(routes, [
    { method: "get", path: "/search" },
    { method: "get", path: "/items/:id" },
    { method: "get", path: "/items/:id/stock" },
  ]);
});
