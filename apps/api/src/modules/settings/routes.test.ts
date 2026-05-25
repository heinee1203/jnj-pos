import assert from "node:assert/strict";
import test from "node:test";

type RouteMethod = "get" | "put";

type RegisteredRoute = {
  method: RouteMethod;
  path: string;
};

function createRouteRecorder() {
  const routes: RegisteredRoute[] = [];
  const app = {
    get(path: string) {
      routes.push({ method: "get", path });
    },
    put(path: string) {
      routes.push({ method: "put", path });
    },
  };

  return { app, routes };
}

test("settings route registration preserves public endpoint order", async () => {
  process.env.DATABASE_URL ??= "postgres://jnj:jnj@localhost:5432/jnj_test";
  const { settingsRoutes } = await import("./routes");
  const { app, routes } = createRouteRecorder();

  await settingsRoutes(app as any, {} as any);

  assert.deepEqual(routes, [
    { method: "get", path: "/company" },
    { method: "put", path: "/company" },
  ]);
});
