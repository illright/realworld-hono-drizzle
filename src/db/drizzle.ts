import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema.js";

if (!process.env.DB_FILE_NAME) {
	throw new Error("Env DB_FILE_NAME is not defined, see .env.example");
}

export const db = drizzle(process.env.DB_FILE_NAME, { schema });
