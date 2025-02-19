import { relations } from "drizzle-orm";
import { int, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
			.references(() => usersTable.id),
		followedId: int()
			.notNull()
			.references(() => usersTable.id),
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
