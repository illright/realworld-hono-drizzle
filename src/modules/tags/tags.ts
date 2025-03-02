import { Hono } from "hono";
import { parse } from "valibot";

import type { ThisAppEnv } from "../../factory.js";
import { ListOfTags } from "./schema.js";

export const tagsModule = new Hono<ThisAppEnv>();

tagsModule.get("/", async (c) => {
	const db = c.get("db");
	const tags = await db.query.tagsTable.findMany();

	return c.json(parse(ListOfTags, { tags: tags.map(({ tag }) => tag) }));
});
