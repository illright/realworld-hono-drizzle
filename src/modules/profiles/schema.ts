import { boolean, nullable, object, string } from "valibot";

export const ProfileResponse = object({
	profile: object({
		username: string(),
		bio: nullable(string()),
		image: nullable(string()),
		following: boolean(),
	}),
});
