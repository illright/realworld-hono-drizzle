import { vValidator } from "@hono/valibot-validator";
import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { parse } from "valibot";

import { JwtClaims } from "../../auth.js";
import { usersTable } from "../../db/schema.js";
import type { ThisAppEnv } from "../../factory.js";
import {
	LoginCredentials,
	RegistrationDetails,
	UserResponse,
} from "./schema.js";

export const usersModule = new Hono<ThisAppEnv>();

usersModule.post("/login", vValidator("json", LoginCredentials), async (c) => {
	const db = c.get("db");
	const requestData = c.req.valid("json");
	const user = await db.query.usersTable.findFirst({
		where: eq(usersTable.email, requestData.user.email),
	});

	const isMatch =
		user !== undefined &&
		(await bcrypt.compare(requestData.user.password, user.passwordHash));

	if (!isMatch) {
		return c.json({ errors: { password: ["invalid for this email"] } }, 422);
	}

	const token = await sign(parse(JwtClaims, user), c.env.JWT_SECRET);

	return c.json(parse(UserResponse, { user: { ...user, token } }));
});

usersModule.post("/", vValidator("json", RegistrationDetails), async (c) => {
	const db = c.get("db");
	const requestData = c.req.valid("json");

	const existingUser = await db.query.usersTable.findFirst({
		where: or(
			eq(usersTable.email, requestData.user.email),
			eq(usersTable.username, requestData.user.username),
		),
	});

	if (existingUser?.email === requestData.user.email) {
		return c.json({ errors: { email: ["already in use"] } }, 422);
	}
	if (existingUser?.username === requestData.user.username) {
		return c.json({ errors: { username: ["already in use"] } }, 422);
	}

	const passwordHash = await bcrypt.hash(requestData.user.password, 10);

	const [user] = await db
		.insert(usersTable)
		.values({
			email: requestData.user.email,
			username: requestData.user.username,
			passwordHash,
		})
		.returning();

	const token = await sign(parse(JwtClaims, user), c.env.JWT_SECRET);

	return c.json(parse(UserResponse, { user: { ...user, token } }));
});
