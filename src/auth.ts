import { createMiddleware } from "hono/factory";
import { jwt } from "hono/jwt";
import { type InferOutput, number, object } from "valibot";

import type { ThisAppEnv } from "./factory.js";

export const JwtClaims = object({
	id: number(),
});

export const jwtAuth = createMiddleware<{
	Variables: { jwtPayload: InferOutput<typeof JwtClaims> };
	Bindings: ThisAppEnv["Bindings"];
}>((c, next) => {
	const jwtMiddleware = jwt({
		secret: c.env.JWT_SECRET,
	});
	return jwtMiddleware(c, next);
});

export const exposeToken = createMiddleware<{
	Variables: {
		token: string | undefined;
	};
}>(async (c, next) => {
	const token = c.req.header("Authorization")?.split(" ")[1];

	c.set("token", token);
	await next();
});
