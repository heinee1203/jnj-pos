export function GET() {
  return Response.json({
    status: "ok",
    service: "jnj-web",
    timestamp: new Date().toISOString(),
  });
}
