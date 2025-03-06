#!/usr/bin/env node
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { serve } from "@hono/node-server";
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

serve({
	fetch(request, httpBindings) {
		return app.fetch(request, { ...env, ...httpBindings });
	},
	port: env.PORT,
});
