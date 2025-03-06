import "dotenv/config";
import slugify from "@sindresorhus/slugify";
import { copycat } from "@snaplet/copycat";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "../src/db/schema.js";

if (!process.env.DATABASE_URL) {
	throw new Error("Env DATABASE_URL is not defined, see .env.example");
}

export const db = drizzle(process.env.DATABASE_URL, { schema });

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
		body: copycat.paragraph(seedPhrase),
	};
}

function hashPassword(user: ReturnType<typeof makeUser>) {
	const { password, ...userRest } = user;
	return { ...userRest, passwordHash: bcrypt.hashSync(password, 10) };
}

await Promise.all([
	db.delete(schema.tagsTable),
	db.delete(schema.articlesTable),
	db.delete(schema.usersTable),
]);

const user1 = makeUser("user1");
const user2 = makeUser("user2");
const user3 = makeUser("user3");
const [{ id: user1Id }, { id: user2Id }, { id: user3Id }] = (await db
	.insert(schema.usersTable)
	.values([user1, user2, user3].map(hashPassword))
	.returning({ id: schema.usersTable.id })) as [
	{ id: number },
	{ id: number },
	{ id: number },
];

await db.insert(schema.articlesTable).values([
	{ ...makeArticle("article1"), authorId: user1Id },
	{ ...makeArticle("article11"), authorId: user1Id },
	{ ...makeArticle("article12"), authorId: user1Id },
	{ ...makeArticle("article2"), authorId: user2Id },
	{ ...makeArticle("article3"), authorId: user3Id },
]);

await db.insert(schema.commentsTable).values([
	{
		articleSlug: makeArticle("article1").slug,
		body: copycat.paragraph("comment1"),
		authorId: user1Id,
	},
	{
		articleSlug: makeArticle("article1").slug,
		body: copycat.paragraph("comment2"),
		authorId: user2Id,
	},
	{
		articleSlug: makeArticle("article2").slug,
		body: copycat.paragraph("comment3"),
		authorId: user1Id,
	},
	{
		articleSlug: makeArticle("article2").slug,
		body: copycat.paragraph("comment4"),
		authorId: user3Id,
	},
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

await db.insert(schema.userFollowTable).values([
	{ followerId: user1Id, followedId: user2Id },
	{ followerId: user1Id, followedId: user3Id },
	{ followerId: user2Id, followedId: user1Id },
	{ followerId: user2Id, followedId: user3Id },
	{ followerId: user3Id, followedId: user1Id },
]);

console.log(
	"Seed completed! Run `pnpm exec drizzle-kit studio` to view the data.",
);
