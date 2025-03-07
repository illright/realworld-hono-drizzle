import "dotenv/config";
import slugify from "@sindresorhus/slugify";
import { copycat } from "@snaplet/copycat";
import bcrypt from "bcryptjs";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

import * as schema from "./schema.js";

export function seed(db: LibSQLDatabase) {
	return db.transaction(async (db) => {
		await db.delete(schema.tagsTable);
		await db.delete(schema.articlesTable);
		await db.delete(schema.usersTable);

		// Create 10 users
		const userCount = 10;
		const users = Array.from({ length: userCount }, (_, i) =>
			makeUser(`user${i + 1}`),
		);

		const userIds = (await db
			.insert(schema.usersTable)
			.values(users.map(hashPassword))
			.returning({ id: schema.usersTable.id })) as Array<{ id: number }>;

		// Create 30 articles distributed among users
		const articleCount = 30;
		const articles = Array.from({ length: articleCount }, (_, i) => {
			// biome-ignore lint/style/noNonNullAssertion: the index is always in range
			const authorId = userIds[i % userCount]!.id;
			return { ...makeArticle(`article${i + 1}`), authorId };
		});

		await db.insert(schema.articlesTable).values(articles);

		// Create 7 tags
		const tags = Array.from({ length: 7 }, (_, i) => ({
			tag: copycat.word(`tag${i + 1}`),
		}));

		await db.insert(schema.tagsTable).values(tags);

		// Create 20 comments, with 5 on one article (article1)
		const comments = [];
		// 5 comments on article1
		for (let i = 0; i < 5; i++) {
			comments.push({
				articleSlug: makeArticle("article1").slug,
				body: copycat.paragraph(`comment${i + 1}_article1`),
				// biome-ignore lint/style/noNonNullAssertion: the index is always in range
				authorId: userIds[i % userCount]!.id,
			});
		}

		// 15 more comments distributed among other articles
		for (let i = 0; i < 15; i++) {
			const articleNum = (i % (articleCount - 1)) + 2; // Skip article1 (starts from article2)
			comments.push({
				articleSlug: makeArticle(`article${articleNum}`).slug,
				body: copycat.paragraph(`comment${i + 6}`),
				// biome-ignore lint/style/noNonNullAssertion: the index is always in range
				authorId: userIds[(i + 3) % userCount]!.id,
			});
		}

		await db.insert(schema.commentsTable).values(comments);

		// Create article-tag relationships (each article gets 1-3 random tags)
		const articleTagRelations = [];
		for (let i = 0; i < articleCount; i++) {
			const tagCount = (i % 3) + 1; // 1-3 tags per article
			for (let j = 0; j < tagCount; j++) {
				articleTagRelations.push({
					articleSlug: makeArticle(`article${i + 1}`).slug,
					tag: copycat.word(`tag${((i + j) % 7) + 1}`),
				});
			}
		}

		await db.insert(schema.articleTagTable).values(articleTagRelations);

		// Create article favorites (some users favorite some articles)
		const favorites = [];
		for (let i = 0; i < 20; i++) {
			favorites.push({
				articleSlug: makeArticle(`article${(i % articleCount) + 1}`).slug,
				// biome-ignore lint/style/noNonNullAssertion: the index is always in range
				userId: userIds[(i + 2) % userCount]!.id,
			});
		}

		await db.insert(schema.articleFavoriteTable).values(favorites);

		// Create user follows (create a network of followers)
		const follows = [];
		for (let i = 0; i < userCount; i++) {
			// Each user follows 3 other users (modulo logic to avoid self-follows)
			for (let j = 1; j <= 3; j++) {
				const followedIndex = (i + j) % userCount;
				if (followedIndex !== i) {
					// Avoid self-follows
					follows.push({
						// biome-ignore lint/style/noNonNullAssertion: the index is always in range
						followerId: userIds[i]!.id,
						// biome-ignore lint/style/noNonNullAssertion: the index is always in range
						followedId: userIds[followedIndex]!.id,
					});
				}
			}
		}

		await db.insert(schema.userFollowTable).values(follows);
	});
}

function makeUser(seedPhrase: string) {
	return {
		email: copycat.email(seedPhrase),
		username: copycat.username(seedPhrase),
		password: copycat.password(seedPhrase),
		bio: copycat.sentence(seedPhrase),
	};
}

function makeArticle(seedPhrase: string) {
	const title = copycat.sentence(seedPhrase);
	const slug = slugify(title);
	return {
		slug,
		title,
		description: copycat.sentence(seedPhrase),
		body: Array.from({ length: 5 }, () => copycat.paragraph(seedPhrase)).join(
			"\n\n",
		),
	};
}

function hashPassword(user: ReturnType<typeof makeUser>) {
	const { password, ...userRest } = user;
	return { ...userRest, passwordHash: bcrypt.hashSync(password, 10) };
}
