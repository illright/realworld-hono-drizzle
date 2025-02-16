import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { jwt } from "hono/jwt";

if (!process.env.JWT_SECRET) {
	throw new Error("Env JWT_SECRET is not defined, see .env.example");
}

export const jwtAuth = jwt({
	secret: process.env.JWT_SECRET,
});

export const exposeToken = createMiddleware<{
	Variables: {
		token: string;
	};
}>(async (c, next) => {
	const token = c.req.header("Authorization")?.split(" ")[1];
	if (token === undefined) {
		throw new HTTPException(401, {
			message: "No token in the Authorization header",
		});
	}

	c.set("token", token);
	await next();
});
