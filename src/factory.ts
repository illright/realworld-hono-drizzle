import { type LibSQLDatabase, drizzle } from "drizzle-orm/libsql";
import { createFactory } from "hono/factory";

import * as schema from "./db/schema.js";
import { articlesModule } from "./modules/articles/articles.js";
import { commentsModule } from "./modules/articles/comments.js";
import { profilesModule } from "./modules/profiles/profiles.js";
import { tagsModule } from "./modules/tags/tags.js";
import { userModule } from "./modules/users/user.js";
import { usersModule } from "./modules/users/users.js";

export interface ThisAppEnv {
	Variables: { db: LibSQLDatabase<typeof schema> };
	Bindings: {
		DATABASE_URL: string;
		JWT_SECRET: string;
	};
}

export const factory = createFactory<ThisAppEnv>({
	initApp(app) {
		app.use(async (c, next) => {
			const db = drizzle(c.env.DATABASE_URL, { schema });
			c.set("db", db);
			await next();
		});

		app.route("/api/users", usersModule);
		app.route("/api/user", userModule);
		app.route("/api/profiles", profilesModule);
		app.route("/api/articles", articlesModule);
		app.route("/api/articles", commentsModule);
		app.route("/api/tags", tagsModule);
	},
});
