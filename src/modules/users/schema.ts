import { url, email, nullable, object, partial, pipe, string } from "valibot";

export const LoginCredentials = object({
	user: object({
		email: pipe(string(), email()),
		password: string(),
	}),
});

export const RegistrationDetails = object({
	user: object({
		username: string(),
		email: pipe(string(), email()),
		password: string(),
	}),
});

export const UpdatedDetails = object({
	user: partial(
		object({
			username: string(),
			email: pipe(string(), email()),
			password: string(),
			bio: nullable(string()),
			image: nullable(pipe(string(), url())),
		}),
	),
});

export const UserResponse = object({
	user: object({
		email: string(),
		token: string(),
		username: string(),
		bio: nullable(string()),
		image: nullable(string()),
	}),
});
