import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import type { JwtVariables } from "hono/jwt";

import { articlesModule } from "./modules/articles/articles.js";
import { commentsModule } from "./modules/articles/comments.js";
import { profilesModule } from "./modules/profiles/profiles.js";
import { tagsModule } from "./modules/tags/tags.js";
import { userModule } from "./modules/users/user.js";
import { usersModule } from "./modules/users/users.js";

const app = new Hono<{ Variables: JwtVariables }>();

app.route("/api/users", usersModule);
app.route("/api/user", userModule);
app.route("/api/profiles", profilesModule);
app.route("/api/articles", articlesModule);
app.route("/api/articles", commentsModule);
app.route("/api/tags", tagsModule);

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
	fetch: app.fetch,
	port,
});
