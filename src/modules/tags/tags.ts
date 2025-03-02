import { Hono } from "hono";
import { parse } from "valibot";
import { db } from "../../db/drizzle.js";
import { ListOfTags } from "./schema.js";

export const tagsModule = new Hono();

tagsModule.get("/", async (c) => {
	const tags = await db.query.tagsTable.findMany();

	return c.json(parse(ListOfTags, { tags: tags.map(({ tag }) => tag) }));
});
