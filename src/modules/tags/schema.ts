import { array, object, string } from "valibot";

export const ListOfTags = object({
	tags: array(string()),
});
