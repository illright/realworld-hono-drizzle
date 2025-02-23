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
import { Hono } from "hono";
import { decode } from "hono/jwt";
import { array, parse, string } from "valibot";
import { JwtClaims, exposeToken } from "../../auth.js";
import { db } from "../../db/drizzle.js";
import {
	articleFavoriteTable,
	articleRelations,
	articleTagTable,
	articlesTable,
	userFollowTable,
	usersTable,
} from "../../db/schema.js";
import { MultipleArticlesResponse } from "./schema.js";

export const articlesModule = new Hono();

const TagList = array(string());

articlesModule.get("/", exposeToken, async (c) => {
	const token = c.get("token");
	const self =
		token !== undefined ? parse(JwtClaims, decode(token).payload) : null;

	const {
		body: _body,
		authorId: _authorId,
		...desiredColumns
	} = getTableColumns(articlesTable);

	const tagFilter = c.req.query("tag");
	const authorFilter = c.req.query("author");
	const favoritedFilter = c.req.query("favorited");
	const limit = Number(c.req.query("limit") ?? 20);
	const offset = Number(c.req.query("offset") ?? 0);

	const favoritingUsersTable = aliasedTable(usersTable, "favoritingUsersTable");
	const articles = await db
		.select({
			...desiredColumns,
			favorited: (self === null
				? sql<number>`0`
				: exists(
						db
							.select({ exists: sql`1` })
							.from(articleFavoriteTable)
							.where(
								and(
									eq(articleFavoriteTable.articleSlug, articlesTable.slug),
									eq(articleFavoriteTable.userId, self.id),
								),
							),
					)
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
					: exists(
							db
								.select({ exists: sql`1` })
								.from(usersTable)
								.innerJoin(
									userFollowTable,
									eq(userFollowTable.followedId, usersTable.id),
								)
								.where(
									and(
										eq(userFollowTable.followerId, self.id),
										eq(userFollowTable.followedId, articlesTable.authorId),
									),
								),
						)
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
		.innerJoin(
			favoritingUsersTable,
			eq(favoritingUsersTable.id, articleFavoriteTable.userId),
		)
		.where(
			and(
				tagFilter ? eq(articleTagTable.tag, tagFilter) : undefined,
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
