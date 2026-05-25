import { db } from "@jnj/database";
import { sql } from "drizzle-orm";

export async function assertDatabaseConnected() {
  await db.execute(sql`SELECT 1`);
}
