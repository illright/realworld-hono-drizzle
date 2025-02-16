import { vValidator } from "@hono/valibot-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { parse } from "valibot";

import { exposeToken, jwtAuth } from "../../auth.js";
import { db } from "../../db/drizzle.js";
import { usersTable } from "../../db/schema.js";
import { UpdatedDetails, UserResponse } from "./schema.js";

export const userModule = new Hono().use(jwtAuth).use(exposeToken);

userModule.get("/", async (c) => {
	const payload = c.get("jwtPayload");
	const user = await db.query.usersTable.findFirst({
		where: eq(usersTable.id, payload.id),
	});

	if (user === undefined) {
		return c.notFound();
	}

	return c.json(
		parse(UserResponse, { user: { ...user, token: c.get("token") } }),
	);
});

userModule.put("/", vValidator("json", UpdatedDetails), async (c) => {
	const payload = c.get("jwtPayload");
	const user = await db.query.usersTable.findFirst({
		where: eq(usersTable.id, payload.id),
	});

	if (user === undefined) {
		return c.notFound();
	}

	const requestData = c.req.valid("json");
	const [updatedUser] = await db
		.update(usersTable)
		.set(requestData.user)
		.where(eq(usersTable.id, payload.id))
		.returning();

	return c.json(
		parse(UserResponse, { user: { ...updatedUser, token: c.get("token") } }),
	);
});
