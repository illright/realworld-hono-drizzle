import type { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";
import { jwt } from "hono/jwt";
import { type InferOutput, number, object } from "valibot";

if (!process.env.JWT_SECRET) {
	throw new Error("Env JWT_SECRET is not defined, see .env.example");
}

export const JwtClaims = object({
	id: number(),
});

export const jwtAuth = jwt({
	secret: process.env.JWT_SECRET,
}) as MiddlewareHandler<{
	Variables: { jwtPayload: InferOutput<typeof JwtClaims> };
}>;

export const exposeToken = createMiddleware<{
	Variables: {
		token: string | undefined;
	};
}>(async (c, next) => {
	const token = c.req.header("Authorization")?.split(" ")[1];

	c.set("token", token);
	await next();
});
