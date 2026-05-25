import assert from "node:assert/strict";
import test from "node:test";

type RegisteredRoute = {
  method: "get";
  path: string;
};

function createRouteRecorder() {
  const routes: RegisteredRoute[] = [];
  const app = {
    get(path: string) {
      routes.push({ method: "get", path });
    },
  };

  return { app, routes };
}

test("health route registration preserves public endpoint order", async () => {
  process.env.DATABASE_URL ??= "postgres://jnj:jnj@localhost:5432/jnj_test";
  const { healthRoutes } = await import("./routes");
  const { app, routes } = createRouteRecorder();

  await healthRoutes(app as any, {} as any);

  assert.deepEqual(routes, [{ method: "get", path: "/" }]);
});
