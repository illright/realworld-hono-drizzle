import "dotenv/config";
import { serve } from "@hono/node-server";
import { drizzle } from "drizzle-orm/libsql";
import { Hono } from "hono";
import { jwt } from "hono/jwt";
import type { JwtVariables } from "hono/jwt";

if (!process.env.DB_FILE_NAME) {
	throw new Error("Env DB_FILE_NAME is not defined, see .env.example");
}
if (!process.env.JWT_SECRET) {
	throw new Error("Env JWT_SECRET is not defined, see .env.example");
}

const db = drizzle(process.env.DB_FILE_NAME);

const app = new Hono<{ Variables: JwtVariables }>();
app.use(
	"/*",
	jwt({
		secret: process.env.JWT_SECRET,
	}),
);

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
	fetch: app.fetch,
	port,
});
