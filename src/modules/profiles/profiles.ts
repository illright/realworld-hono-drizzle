import { vValidator } from "@hono/valibot-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { parse } from "valibot";

import { decode } from "hono/jwt";
import { JwtClaims, exposeToken, jwtAuth } from "../../auth.js";
import { db } from "../../db/drizzle.js";
import { userFollowTable, usersTable } from "../../db/schema.js";
import { ProfileResponse } from "./schema.js";

export const profilesModule = new Hono();

profilesModule.get("/:username", exposeToken, async (c) => {
	const token = c.get("token");
	const self =
		token !== undefined ? parse(JwtClaims, decode(token).payload) : null;

	const user = await db.query.usersTable.findFirst({
		where: eq(usersTable.username, c.req.param("username")),
	});

	if (user === undefined) {
		return c.notFound();
	}

	const following =
		self !== null
			? (await db.query.userFollowTable.findFirst({
					where: and(
						eq(userFollowTable.followerId, self.id),
						eq(userFollowTable.followedId, user.id),
					),
				})) !== undefined
			: false;

	return c.json(parse(ProfileResponse, { profile: { ...user, following } }));
});

profilesModule.post("/:username/follow", jwtAuth, async (c) => {
	const self = c.get("jwtPayload");
	const userToFollow = await db.query.usersTable.findFirst({
		where: eq(usersTable.username, c.req.param("username")),
	});

	if (userToFollow === undefined) {
		return c.notFound();
	}

	await db.insert(userFollowTable).values({
		followerId: self.id,
		followedId: userToFollow.id,
	});

	return c.json(
		parse(ProfileResponse, { profile: { ...userToFollow, following: true } }),
	);
});

profilesModule.delete("/:username/follow", jwtAuth, async (c) => {
	const self = c.get("jwtPayload");
	const userToUnfollow = await db.query.usersTable.findFirst({
		where: eq(usersTable.username, c.req.param("username")),
	});

	if (userToUnfollow === undefined) {
		return c.notFound();
	}

	await db
		.delete(userFollowTable)
		.where(
			and(
				eq(userFollowTable.followerId, self.id),
				eq(userFollowTable.followedId, userToUnfollow.id),
			),
		);

	return c.json(
		parse(ProfileResponse, {
			profile: { ...userToUnfollow, following: false },
		}),
	);
});
