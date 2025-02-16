import "dotenv/config";
import { copycat } from "@snaplet/copycat";
import bcrypt from "bcryptjs";

import { db } from "../src/db/drizzle.js";
import * as schema from "../src/db/schema.js";

if (!process.env.DB_FILE_NAME) {
	throw new Error("Env DB_FILE_NAME is not defined, see .env.example");
}

await db.delete(schema.usersTable);
const user1 = {
	email: copycat.email("user1"),
	username: copycat.username("user1"),
	password: copycat.password("user1"),
	bio: copycat.sentence("user1"),
};
console.log("Inserting user1:", user1);
await db
	.insert(schema.usersTable)
	.values({ ...user1, passwordHash: await bcrypt.hash(user1.password, 10) });

console.log("Seed completed!");
