import { vValidator } from "@hono/valibot-validator";
import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { parse } from "valibot";

import { JwtClaims } from "../../auth.js";
import { db } from "../../db/drizzle.js";
import { usersTable } from "../../db/schema.js";
import {
	LoginCredentials,
	RegistrationDetails,
	UserResponse,
} from "./schema.js";

if (!process.env.JWT_SECRET) {
	throw new Error("Env JWT_SECRET is not defined, see .env.example");
}

export const usersModule = new Hono();

usersModule.post("/login", vValidator("json", LoginCredentials), async (c) => {
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

	// biome-ignore lint/style/noNonNullAssertion: this whole module won't load if JWT_SECRET is not defined
	const token = await sign(parse(JwtClaims, user), process.env.JWT_SECRET!);

	return c.json(parse(UserResponse, { user: { ...user, token } }));
});

usersModule.post("/", vValidator("json", RegistrationDetails), async (c) => {
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

	// biome-ignore lint/style/noNonNullAssertion: this whole module won't load if JWT_SECRET is not defined
	const token = await sign(parse(JwtClaims, user), process.env.JWT_SECRET!);

	return c.json(parse(UserResponse, { user: { ...user, token } }));
});
