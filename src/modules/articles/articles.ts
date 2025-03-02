import { vValidator } from "@hono/valibot-validator";
import slugify from "@sindresorhus/slugify";
import {
	and,
	countDistinct,
	desc,
	eq,
	exists,
	getTableColumns,
	sql,
} from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { Hono } from "hono";
import { decode } from "hono/jwt";
import { type InferOutput, array, parse, string } from "valibot";

import { JwtClaims, exposeToken, jwtAuth } from "../../auth.js";
import type * as schema from "../../db/schema.js";
import {
	articleFavoriteTable,
	articleTagTable,
	articlesTable,
	tagsTable,
	userFollowTable,
	usersTable,
} from "../../db/schema.js";
import type { ThisAppEnv } from "../../factory.js";
import { amIFollowing } from "./am-i-following.js";
import {
	ArticleToCreate,
	MultipleArticlesResponse,
	SingleArticleResponse,
	UpdatedArticle,
} from "./schema.js";

export const articlesModule = new Hono<ThisAppEnv>();

const TagList = array(string());

/** Subquery to include the `favorited` field on an article. */
function isFavorited({
	db,
	articleSlug,
	me,
}: {
	db: LibSQLDatabase<typeof schema>;
	articleSlug: SQLiteColumn;
	me: number;
}) {
	return exists(
		db
			.select({ exists: sql`1` })
			.from(articleFavoriteTable)
			.where(
				and(
					eq(articleFavoriteTable.articleSlug, articleSlug),
					eq(articleFavoriteTable.userId, me),
				),
			),
	);
}

async function findArticle(
	db: LibSQLDatabase<typeof schema>,
	slug: string,
	self: InferOutput<typeof JwtClaims> | null,
) {
	const [article] = await db
		.select({
			...getTableColumns(articlesTable),
			favorited: (self === null
				? sql<number>`0`
				: isFavorited({ db, articleSlug: articlesTable.slug, me: self.id })
			).mapWith(Boolean),
			favoritesCount: countDistinct(articleFavoriteTable.userId).as(
				"favoritesCount",
			),
			tagList:
				sql<string>`json_group_array(DISTINCT ${articleTagTable.tag}) filter (where ${articleTagTable.tag} is not null)`.mapWith(
					(tagList) => parse(TagList, JSON.parse(tagList)),
				),
			author: {
				username: usersTable.username,
				bio: usersTable.bio,
				image: usersTable.image,
				following: (self === null
					? sql<number>`0`
					: amIFollowing({ db, them: articlesTable.authorId, me: self.id })
				).mapWith(Boolean),
			},
		})
		.from(articlesTable)
		.leftJoin(
			articleFavoriteTable,
			eq(articlesTable.slug, articleFavoriteTable.articleSlug),
		)
		.leftJoin(
			articleTagTable,
			eq(articlesTable.slug, articleTagTable.articleSlug),
		)
		.innerJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
		.where(eq(articlesTable.slug, slug))
		.groupBy(articlesTable.slug);

	return article;
}

articlesModule.get("/", exposeToken, async (c) => {
	const db = c.get("db");
	const token = c.get("token");
	const self =
		token !== undefined ? parse(JwtClaims, decode(token).payload) : null;

	const tagFilter = c.req.query("tag");
	const authorFilter = c.req.query("author");
	const favoritedFilter = c.req.query("favorited");
	const limit = Number(c.req.query("limit") ?? 20);
	const offset = Number(c.req.query("offset") ?? 0);

	const {
		body: _body,
		authorId: _authorId,
		...desiredColumns
	} = getTableColumns(articlesTable);

	const slugsWithTagFilter = tagFilter
		? db
				.select({ slug: articleTagTable.articleSlug })
				.from(articleTagTable)
				.where(eq(articleTagTable.tag, tagFilter))
				.as("slugsWithTagFilter")
		: null;
	const slugsWithFavoritedFilter = favoritedFilter
		? db
				.select({ slug: articleFavoriteTable.articleSlug })
				.from(articleFavoriteTable)
				.innerJoin(usersTable, eq(articleFavoriteTable.userId, usersTable.id))
				.where(eq(usersTable.username, favoritedFilter))
				.as("slugsWithFavoritedFilter")
		: null;

	const articles = await db
		.select({
			...desiredColumns,
			favorited: (self === null
				? sql<number>`0`
				: isFavorited({ db, articleSlug: articlesTable.slug, me: self.id })
			).mapWith(Boolean),
			favoritesCount: countDistinct(articleFavoriteTable.userId).as(
				"favoritesCount",
			),
			tagList:
				sql<string>`json_group_array(DISTINCT ${articleTagTable.tag}) filter (where ${articleTagTable.tag} is not null)`.mapWith(
					(tagList) => parse(TagList, JSON.parse(tagList)),
				),
			author: {
				username: usersTable.username,
				bio: usersTable.bio,
				image: usersTable.image,
				following: (self === null
					? sql<number>`0`
					: amIFollowing({ db, them: articlesTable.authorId, me: self.id })
				).mapWith(Boolean),
			},
		})
		.from(articlesTable)
		.leftJoin(
			articleFavoriteTable,
			eq(articlesTable.slug, articleFavoriteTable.articleSlug),
		)
		.leftJoin(
			articleTagTable,
			eq(articlesTable.slug, articleTagTable.articleSlug),
		)
		.innerJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
		.where(
			and(
				slugsWithTagFilter
					? exists(
							db
								.select()
								.from(slugsWithTagFilter)
								.where(eq(slugsWithTagFilter.slug, articlesTable.slug)),
						)
					: undefined,
				authorFilter ? eq(usersTable.username, authorFilter) : undefined,
				slugsWithFavoritedFilter
					? exists(
							db
								.select()
								.from(slugsWithFavoritedFilter)
								.where(eq(slugsWithFavoritedFilter.slug, articlesTable.slug)),
						)
					: undefined,
			),
		)
		.limit(limit)
		.offset(offset)
		.groupBy(articlesTable.slug)
		.orderBy(desc(articlesTable.createdAt));

	return c.json(
		parse(MultipleArticlesResponse, {
			articles,
			articlesCount: articles.length,
		}),
	);
});

articlesModule.get("/feed", jwtAuth, async (c) => {
	const db = c.get("db");
	const self = c.get("jwtPayload");

	const limit = Number(c.req.query("limit") ?? 20);
	const offset = Number(c.req.query("offset") ?? 0);

	const {
		body: _body,
		authorId: _authorId,
		...desiredColumns
	} = getTableColumns(articlesTable);

	const articles = await db
		.select({
			...desiredColumns,
			favorited: (self === null
				? sql<number>`0`
				: isFavorited({ db, articleSlug: articlesTable.slug, me: self.id })
			).mapWith(Boolean),
			favoritesCount: countDistinct(articleFavoriteTable.userId).as(
				"favoritesCount",
			),
			tagList:
				sql<string>`json_group_array(DISTINCT ${articleTagTable.tag}) filter (where ${articleTagTable.tag} is not null)`.mapWith(
					(tagList) => parse(TagList, JSON.parse(tagList)),
				),
			author: {
				username: usersTable.username,
				bio: usersTable.bio,
				image: usersTable.image,
				following: (self === null
					? sql<number>`0`
					: amIFollowing({ db, them: articlesTable.authorId, me: self.id })
				).mapWith(Boolean),
			},
		})
		.from(articlesTable)
		.leftJoin(
			articleFavoriteTable,
			eq(articlesTable.slug, articleFavoriteTable.articleSlug),
		)
		.leftJoin(
			articleTagTable,
			eq(articlesTable.slug, articleTagTable.articleSlug),
		)
		.innerJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
		.rightJoin(
			userFollowTable,
			eq(userFollowTable.followedId, articlesTable.authorId),
		)
		.where(eq(userFollowTable.followerId, self.id))
		.limit(limit)
		.offset(offset)
		.groupBy(articlesTable.slug)
		.orderBy(desc(articlesTable.createdAt));

	return c.json(
		parse(MultipleArticlesResponse, {
			articles,
			articlesCount: articles.length,
		}),
	);
});

articlesModule.get("/:slug", exposeToken, async (c) => {
	const db = c.get("db");
	const token = c.get("token");
	const self =
		token !== undefined ? parse(JwtClaims, decode(token).payload) : null;

	const slug = c.req.param("slug");

	const article = await findArticle(db, slug, self);

	if (article === undefined) {
		return c.notFound();
	}

	return c.json(parse(SingleArticleResponse, { article }));
});

articlesModule.post(
	"/",
	jwtAuth,
	vValidator("json", ArticleToCreate),
	async (c) => {
		const db = c.get("db");
		const self = c.get("jwtPayload");

		const { tagList, ...articlePayload } = c.req.valid("json").article;
		const slug = slugify(articlePayload.title);

		await db.insert(articlesTable).values({
			slug,
			...articlePayload,
			authorId: self.id,
		});

		if (tagList !== undefined) {
			await db.insert(tagsTable).values(tagList.map((tag) => ({ tag })));
			await db
				.insert(articleTagTable)
				.values(tagList.map((tag) => ({ articleSlug: slug, tag })));
		}

		const article = await findArticle(db, slug, self);

		return c.json(parse(SingleArticleResponse, { article }));
	},
);

articlesModule.put(
	"/:slug",
	jwtAuth,
	vValidator("json", UpdatedArticle),
	async (c) => {
		const db = c.get("db");
		const self = c.get("jwtPayload");

		let slug = c.req.param("slug");
		const { article: articlePayload } = c.req.valid("json");

		const [articleOwnership] = await db
			.select({ isOwned: eq(articlesTable.authorId, self.id) })
			.from(articlesTable)
			.where(eq(articlesTable.slug, slug));

		if (articleOwnership === undefined) {
			return c.notFound();
		}
		if (!articleOwnership.isOwned) {
			return new Response("Forbidden", { status: 403 });
		}

		await db
			.update(articlesTable)
			.set(articlePayload)
			.where(eq(articlesTable.slug, slug));

		if (articlePayload.title !== undefined) {
			const newSlug = slugify(articlePayload.title);
			await db
				.update(articlesTable)
				.set({ slug: newSlug })
				.where(eq(articlesTable.slug, slug));
			slug = newSlug;
		}

		const article = await findArticle(db, slug, self);

		return c.json(parse(SingleArticleResponse, { article }));
	},
);

articlesModule.delete("/:slug", jwtAuth, async (c) => {
	const db = c.get("db");
	const self = c.get("jwtPayload");

	const slug = c.req.param("slug");

	const [articleOwnership] = await db
		.select({ isOwned: eq(articlesTable.authorId, self.id) })
		.from(articlesTable)
		.where(eq(articlesTable.slug, slug));

	if (articleOwnership === undefined) {
		return c.notFound();
	}
	if (!articleOwnership.isOwned) {
		return new Response("Forbidden", { status: 403 });
	}

	await db.delete(articlesTable).where(eq(articlesTable.slug, slug));

	return new Response(null, { status: 204 });
});

articlesModule.post("/:slug/favorite", jwtAuth, async (c) => {
	const db = c.get("db");
	const self = c.get("jwtPayload");

	const slug = c.req.param("slug");

	const [articleExists] = await db
		.select({ exists: sql`1` })
		.from(articlesTable)
		.where(eq(articlesTable.slug, slug));

	if (articleExists === undefined) {
		return c.notFound();
	}

	await db
		.insert(articleFavoriteTable)
		.values({
			articleSlug: slug,
			userId: self.id,
		})
		.onConflictDoNothing();

	const updatedArticle = await findArticle(db, slug, self);

	return c.json(parse(SingleArticleResponse, { article: updatedArticle }));
});

articlesModule.delete("/:slug/favorite", jwtAuth, async (c) => {
	const db = c.get("db");
	const self = c.get("jwtPayload");

	const slug = c.req.param("slug");

	const [articleExists] = await db
		.select({ exists: sql`1` })
		.from(articlesTable)
		.where(eq(articlesTable.slug, slug));

	if (articleExists === undefined) {
		return c.notFound();
	}

	await db
		.delete(articleFavoriteTable)
		.where(
			and(
				eq(articleFavoriteTable.articleSlug, slug),
				eq(articleFavoriteTable.userId, self.id),
			),
		);

	const updatedArticle = await findArticle(db, slug, self);

	return c.json(parse(SingleArticleResponse, { article: updatedArticle }));
});
