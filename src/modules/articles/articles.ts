import { vValidator } from "@hono/valibot-validator";
import slugify from "@sindresorhus/slugify";
import {
	aliasedTable,
	and,
	count,
	desc,
	eq,
	exists,
	getTableColumns,
	sql,
} from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { Hono } from "hono";
import { decode } from "hono/jwt";
import { type InferOutput, array, parse, string } from "valibot";
import { JwtClaims, exposeToken, jwtAuth } from "../../auth.js";
import { db } from "../../db/drizzle.js";
import {
	articleFavoriteTable,
	articleTagTable,
	articlesTable,
	tagsTable,
	userFollowTable,
	usersTable,
} from "../../db/schema.js";
import { amIFollowing } from "./am-i-following.js";
import {
	ArticleToCreate,
	MultipleArticlesResponse,
	SingleArticleResponse,
	UpdatedArticle,
} from "./schema.js";

export const articlesModule = new Hono();

const TagList = array(string());

function isFavorited({
	articleSlug,
	me,
}: { articleSlug: SQLiteColumn; me: number }) {
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
	slug: string,
	self: InferOutput<typeof JwtClaims> | null,
) {
	const [article] = await db
		.select({
			...getTableColumns(articlesTable),
			favorited: (self === null
				? sql<number>`0`
				: isFavorited({ articleSlug: articlesTable.slug, me: self.id })
			).mapWith(Boolean),
			favoritesCount: count(articleFavoriteTable.userId).as("favoritesCount"),
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
					: amIFollowing({ them: articlesTable.authorId, me: self.id })
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

	const favoritingUsersTable = aliasedTable(usersTable, "favoritingUsersTable");
	const articles = await db
		.select({
			...desiredColumns,
			favorited: (self === null
				? sql<number>`0`
				: isFavorited({ articleSlug: articlesTable.slug, me: self.id })
			).mapWith(Boolean),
			favoritesCount: count(articleFavoriteTable.userId).as("favoritesCount"),
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
					: amIFollowing({ them: articlesTable.authorId, me: self.id })
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
		.leftJoin(
			favoritingUsersTable,
			eq(favoritingUsersTable.id, articleFavoriteTable.userId),
		)
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
				favoritedFilter
					? eq(favoritingUsersTable.username, favoritedFilter)
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
				: isFavorited({ articleSlug: articlesTable.slug, me: self.id })
			).mapWith(Boolean),
			favoritesCount: count(articleFavoriteTable.userId).as("favoritesCount"),
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
					: amIFollowing({ them: articlesTable.authorId, me: self.id })
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
	const token = c.get("token");
	const self =
		token !== undefined ? parse(JwtClaims, decode(token).payload) : null;

	const slug = c.req.param("slug");

	const article = await findArticle(slug, self);

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

		const article = await findArticle(slug, self);

		return c.json(parse(SingleArticleResponse, { article }));
	},
);

articlesModule.put(
	"/:slug",
	jwtAuth,
	vValidator("json", UpdatedArticle),
	async (c) => {
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

		const article = await findArticle(slug, self);

		return c.json(parse(SingleArticleResponse, { article }));
	},
);

articlesModule.delete("/:slug", jwtAuth, async (c) => {
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
