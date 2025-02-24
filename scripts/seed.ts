import "dotenv/config";
import { copycat } from "@snaplet/copycat";
import bcrypt from "bcryptjs";

import slugify from "@sindresorhus/slugify";
import { db } from "../src/db/drizzle.js";
import * as schema from "../src/db/schema.js";

if (!process.env.DB_FILE_NAME) {
	throw new Error("Env DB_FILE_NAME is not defined, see .env.example");
}

function createUser(seedPhrase: string) {
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
		body: copycat.paragraph(seedPhrase),
	};
}

function hashPassword(user: ReturnType<typeof createUser>) {
	const { password, ...userRest } = user;
	return { ...userRest, passwordHash: bcrypt.hashSync(password, 10) };
}

await db.delete(schema.articleFavoriteTable);
await db.delete(schema.articleTagTable);
await db.delete(schema.tagsTable);
await db.delete(schema.articlesTable);
await db.delete(schema.usersTable);

const user1 = createUser("user1");
const user2 = createUser("user2");
const user3 = createUser("user3");
const [{ id: user1Id }, { id: user2Id }, { id: user3Id }] = await db
	.insert(schema.usersTable)
	.values([user1, user2, user3].map(hashPassword))
	.returning({ id: schema.usersTable.id });

await db.insert(schema.articlesTable).values([
	{ ...makeArticle("article1"), authorId: user1Id },
	{ ...makeArticle("article11"), authorId: user1Id },
	{ ...makeArticle("article12"), authorId: user1Id },
	{ ...makeArticle("article2"), authorId: user2Id },
	{ ...makeArticle("article3"), authorId: user3Id },
]);

await db
	.insert(schema.tagsTable)
	.values([
		{ tag: copycat.word("tag1") },
		{ tag: copycat.word("tag2") },
		{ tag: copycat.word("tag3") },
	]);

await db.insert(schema.articleTagTable).values([
	{ articleSlug: makeArticle("article1").slug, tag: copycat.word("tag1") },
	{ articleSlug: makeArticle("article1").slug, tag: copycat.word("tag2") },
	{ articleSlug: makeArticle("article2").slug, tag: copycat.word("tag1") },
	{ articleSlug: makeArticle("article2").slug, tag: copycat.word("tag3") },
	{ articleSlug: makeArticle("article3").slug, tag: copycat.word("tag2") },
]);

await db.insert(schema.articleFavoriteTable).values([
	{ articleSlug: makeArticle("article1").slug, userId: user1Id },
	{ articleSlug: makeArticle("article1").slug, userId: user2Id },
	{ articleSlug: makeArticle("article2").slug, userId: user1Id },
	{ articleSlug: makeArticle("article2").slug, userId: user3Id },
]);

console.log("Seed completed!");
