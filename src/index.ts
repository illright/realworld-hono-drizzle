import { join } from "node:path";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

import { seed as seedInternal } from "./db/seed.js";
import { factory } from "./factory.js";

export default factory.createApp();

/** Create the tables in the given database. */
export function applyMigrations(databaseUrl: string): Promise<void> {
	return migrate(drizzle(databaseUrl), {
		migrationsFolder: join(import.meta.dirname, "../src/db/migrations"),
	});
}

/** Populate the database with fake values. */
export function seed(databaseUrl: string): Promise<void> {
	return seedInternal(drizzle(databaseUrl));
}
