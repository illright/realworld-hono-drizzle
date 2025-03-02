import { and, eq, getTableColumns, sql } from "drizzle-orm";
import { Hono } from "hono";
import { decode } from "hono/jwt";
import { parse } from "valibot";

import { vValidator } from "@hono/valibot-validator";
import { JwtClaims, exposeToken, jwtAuth } from "../../auth.js";
import { articlesTable, commentsTable, usersTable } from "../../db/schema.js";
import type { ThisAppEnv } from "../../factory.js";
import { amIFollowing } from "./am-i-following.js";
import {
	CommentToCreate,
	MultipleCommentsResponse,
	SingleCommentResponse,
} from "./schema.js";

export const commentsModule = new Hono<ThisAppEnv>();

commentsModule.get("/:slug/comments", exposeToken, async (c) => {
	const db = c.get("db");
	const token = c.get("token");
	const self =
		token !== undefined ? parse(JwtClaims, decode(token).payload) : null;

	const slug = c.req.param("slug");

	const [articleExists] = await db
		.select({ exists: sql`1` })
		.from(articlesTable)
		.where(eq(articlesTable.slug, slug));

	if (!articleExists) {
		return c.notFound();
	}

	const {
		authorId: _authorId,
		articleSlug: _articleSlug,
		...desiredColumns
	} = getTableColumns(commentsTable);
	const comments = await db
		.select({
			...desiredColumns,
			author: {
				username: usersTable.username,
				bio: usersTable.bio,
				image: usersTable.image,
				following: (self === null
					? sql<number>`0`
					: amIFollowing({ db, them: commentsTable.authorId, me: self.id })
				).mapWith(Boolean),
			},
		})
		.from(commentsTable)
		.innerJoin(usersTable, eq(commentsTable.authorId, usersTable.id))
		.where(eq(commentsTable.articleSlug, slug));

	return c.json(parse(MultipleCommentsResponse, { comments }));
});

commentsModule.post(
	"/:slug/comments",
	jwtAuth,
	vValidator("json", CommentToCreate),
	async (c) => {
		const db = c.get("db");
		const self = c.get("jwtPayload");

		const slug = c.req.param("slug");

		const [articleExists] = await db
			.select({ exists: sql`1` })
			.from(articlesTable)
			.where(eq(articlesTable.slug, slug));

		if (!articleExists) {
			return c.notFound();
		}

		const {
			authorId: _authorId,
			articleSlug: _articleSlug,
			...desiredColumns
		} = getTableColumns(commentsTable);
		const commentPayload = c.req.valid("json").comment;
		const [addedComment] = await db
			.insert(commentsTable)
			.values([{ ...commentPayload, articleSlug: slug, authorId: self.id }])
			.returning(desiredColumns);

		if (addedComment === undefined) {
			throw new Error("Failed to insert a comment");
		}

		const selfProfile = await db.query.usersTable.findFirst({
			columns: {
				username: true,
				bio: true,
				image: true,
			},
			where: eq(usersTable.id, self.id),
		});

		return c.json(
			parse(SingleCommentResponse, {
				comment: {
					...addedComment,
					author: { ...selfProfile, following: false },
				},
			}),
		);
	},
);

commentsModule.delete("/:slug/comments/:id", jwtAuth, async (c) => {
	const db = c.get("db");
	const self = c.get("jwtPayload");

	const slug = c.req.param("slug");
	const id = Number.parseInt(c.req.param("id"), 10);

	const [commentOwnership] = await db
		.select({ isOwned: eq(commentsTable.authorId, self.id) })
		.from(commentsTable)
		.where(and(eq(commentsTable.id, id), eq(commentsTable.articleSlug, slug)));

	if (commentOwnership === undefined) {
		return c.notFound();
	}
	if (!commentOwnership.isOwned) {
		return new Response("Forbidden", { status: 403 });
	}

	await db.delete(commentsTable).where(eq(commentsTable.id, id));

	return new Response(null, { status: 204 });
});
