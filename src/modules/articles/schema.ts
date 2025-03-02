import {
	array,
	boolean,
	number,
	object,
	omit,
	optional,
	partial,
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

const Comment = object({
	id: number(),
	createdAt: string(),
	updatedAt: string(),
	body: string(),
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
	article: object({
		title: string(),
		description: string(),
		body: string(),
		tagList: optional(array(string())),
	}),
});

export const UpdatedArticle = object({
	article: partial(
		object({
			title: string(),
			description: string(),
			body: string(),
		}),
	),
});

export const SingleCommentResponse = object({
	comment: Comment,
});

export const MultipleCommentsResponse = object({
	comments: array(Comment),
});

export const CommentToCreate = object({
	comment: object({
		body: string(),
	}),
});
