import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import type { JwtVariables } from "hono/jwt";

import { userModule } from "./modules/users/user.js";
import { usersModule } from "./modules/users/users.js";

const app = new Hono<{ Variables: JwtVariables }>();

app.route("/api/users", usersModule);
app.route("/api/user", userModule);

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
	fetch: app.fetch,
	port,
});
