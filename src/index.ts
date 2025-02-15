import "dotenv/config";
import { serve } from "@hono/node-server";
import { drizzle } from "drizzle-orm/libsql";
import { Hono } from "hono";

if (!process.env.DB_FILE_NAME) {
	throw new Error("Env DB_FILE_NAME is not defined, see .env.example");
}

const db = drizzle(process.env.DB_FILE_NAME);

const app = new Hono();

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
	fetch: app.fetch,
	port,
});
