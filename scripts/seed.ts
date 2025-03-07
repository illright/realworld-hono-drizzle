import { join } from "node:path";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

import { seed } from "../src/db/seed.js";

if (!process.env.DATABASE_URL) {
	throw new Error("Env DATABASE_URL is not defined, see .env.example");
}

export const db = drizzle(process.env.DATABASE_URL);
await migrate(db, {
	migrationsFolder: join(import.meta.dirname, "../src/db/migrations"),
});
await seed(db);

console.log(
	"Seed completed! Run `pnpm exec drizzle-kit studio` to view the data.",
);
