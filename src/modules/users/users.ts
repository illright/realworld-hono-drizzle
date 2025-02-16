import { vValidator } from "@hono/valibot-validator";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { type JwtVariables, sign } from "hono/jwt";
import { parse } from "valibot";

import { db } from "../../db/drizzle.js";
import { usersTable } from "../../db/schema.js";
import { LoginCredentials, UserResponse } from "./schema.js";

if (!process.env.JWT_SECRET) {
	throw new Error("Env JWT_SECRET is not defined, see .env.example");
}

export const usersModule = new Hono<{ Variables: JwtVariables }>();

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
	const token = await sign({ id: user.id }, process.env.JWT_SECRET!);

	return c.json(parse(UserResponse, { user: { ...user, token } }));
});
