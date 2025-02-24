import {
	array,
	boolean,
	number,
	object,
	omit,
	optional,
	string,
} from "valibot";
import { Profile } from "../profiles/schema.js";

const Article = object({
	slug: string(),
	title: string(),
	description: string(),
	body: string(),
	tagList: array(string()),
	createdAt: string(),
	updatedAt: string(),
	favorited: boolean(),
	favoritesCount: number(),
	author: Profile,
});

export const SingleArticleResponse = object({
	article: Article,
});

export const MultipleArticlesResponse = object({
	articles: array(omit(Article, ["body"])),
	articlesCount: number(),
});

export const ArticleToCreate = object({
	title: string(),
	description: string(),
	body: string(),
	tagList: optional(array(string())),
});
