import { and, eq, exists, sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

import type * as schema from "../../db/schema.js";
import { userFollowTable } from "../../db/schema.js";

/** Subquery to include the `following` field on a user object. */
export function amIFollowing({
	db,
	me,
	them,
}: { db: LibSQLDatabase<typeof schema>; them: SQLiteColumn; me: number }) {
	return exists(
		db
			.select({ exists: sql`1` })
			.from(userFollowTable)
			.where(
				and(
					eq(userFollowTable.followerId, me),
					eq(userFollowTable.followedId, them),
				),
			),
	);
}
