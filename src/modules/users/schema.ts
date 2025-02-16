import { email, nullable, object, pipe, string } from "valibot";

export const LoginCredentials = object({
	user: object({
		email: pipe(string(), email()),
		password: string(),
	}),
});

export const UserResponse = object({
	user: object({
		email: string(),
		token: string(),
		username: string(),
		bio: string(),
		image: nullable(string()),
	}),
});
