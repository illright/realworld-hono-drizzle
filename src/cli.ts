#!/usr/bin/env node
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import {
	number,
	object,
	optional,
	parse,
	pipe,
	string,
	transform,
} from "valibot";

import { factory } from "./factory.js";

const Environment = object({
	DATABASE_URL: optional(string(), "file:local.db"),
	JWT_SECRET: optional(string(), randomBytes(64).toString("base64url")),
	PORT: pipe(optional(string(), "3000"), transform(Number.parseInt), number()),
});
const env = parse(Environment, process.env);

const app = factory.createApp();

console.log(`Server is running on http://localhost:${env.PORT}`);

migrate(drizzle(env.DATABASE_URL), {
	migrationsFolder: join(import.meta.dirname, "../src/db/migrations"),
}).then(() =>
	serve({
		fetch(request, httpBindings) {
			return app.fetch(request, { ...env, ...httpBindings });
		},
		port: env.PORT,
	}),
);
