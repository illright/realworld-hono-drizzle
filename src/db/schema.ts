import { relations, sql } from "drizzle-orm";
import {
	customType,
	int,
	primaryKey,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

const date = customType<{
	data: string;
	driverData: string;
}>({
	dataType() {
		return "text";
	},
	fromDriver(value: string): string {
		const [date, time] = value.split(" ");
		return `${date}T${time}.000Z`;
	},
});

export const usersTable = sqliteTable("users_table", {
	id: int().primaryKey({ autoIncrement: true }),
	email: text().notNull().unique(),
	username: text().notNull().unique(),
	bio: text(),
	image: text(),
	passwordHash: text().notNull(),
});

export const userFollowTable = sqliteTable(
	"user_follow_table",
	{
		followerId: int()
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
		followedId: int()
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
	},
	(t) => [primaryKey({ columns: [t.followerId, t.followedId] })],
);

export const userFollowRelations = relations(userFollowTable, ({ one }) => ({
	follower: one(usersTable, {
		fields: [userFollowTable.followerId],
		references: [usersTable.id],
	}),
	followed: one(usersTable, {
		fields: [userFollowTable.followedId],
		references: [usersTable.id],
	}),
}));

export const tagsTable = sqliteTable("tags_table", {
	tag: text().notNull().unique(),
});

export const articlesTable = sqliteTable("articles_table", {
	slug: text().primaryKey(),
	title: text().notNull(),
	description: text().notNull(),
	body: text().notNull(),
	createdAt: date().notNull().default(sql`(CURRENT_TIMESTAMP)`),
	updatedAt: date().notNull().default(sql`(CURRENT_TIMESTAMP)`),
	authorId: int()
		.notNull()
		.references(() => usersTable.id, { onDelete: "cascade" }),
});

export const commentsTable = sqliteTable("comments_table", {
	id: int().primaryKey({ autoIncrement: true }),
	createdAt: date().notNull().default(sql`(CURRENT_TIMESTAMP)`),
	updatedAt: date().notNull().default(sql`(CURRENT_TIMESTAMP)`),
	body: text().notNull(),
	articleSlug: text()
		.notNull()
		.references(() => articlesTable.slug, {
			onDelete: "cascade",
			onUpdate: "cascade",
		}),
	authorId: int()
		.notNull()
		.references(() => usersTable.id, { onDelete: "cascade" }),
});

export const articleTagTable = sqliteTable(
	"article_tag_table",
	{
		articleSlug: text()
			.notNull()
			.references(() => articlesTable.slug, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		tag: text()
			.notNull()
			.references(() => tagsTable.tag, { onDelete: "cascade" }),
	},
	(t) => [primaryKey({ columns: [t.articleSlug, t.tag] })],
);

export const articleFavoriteTable = sqliteTable(
	"article_favorite_table",
	{
		articleSlug: text()
			.notNull()
			.references(() => articlesTable.slug, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		userId: int()
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
	},
	(t) => [primaryKey({ columns: [t.articleSlug, t.userId] })],
);

export const articleRelations = relations(articlesTable, ({ one, many }) => ({
	author: one(usersTable, {
		fields: [articlesTable.authorId],
		references: [usersTable.id],
	}),
	tagList: many(articleTagTable),
	commentRelations: many(commentsTable),
}));

export const tagRelations = relations(tagsTable, ({ many }) => ({
	articles: many(articleTagTable),
}));

export const articleTagRelations = relations(articleTagTable, ({ one }) => ({
	article: one(articlesTable, {
		fields: [articleTagTable.articleSlug],
		references: [articlesTable.slug],
	}),
	tag: one(tagsTable, {
		fields: [articleTagTable.tag],
		references: [tagsTable.tag],
	}),
}));

export const commentRelations = relations(commentsTable, ({ one }) => ({
	article: one(articlesTable, {
		fields: [commentsTable.articleSlug],
		references: [articlesTable.slug],
	}),
}));
