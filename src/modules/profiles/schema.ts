import { boolean, nullable, object, string } from "valibot";

export const Profile = object({
	username: string(),
	bio: nullable(string()),
	image: nullable(string()),
	following: boolean(),
});

export const ProfileResponse = object({
	profile: Profile,
});
