import { jwt } from "hono/jwt";

if (!process.env.JWT_SECRET) {
	throw new Error("Env JWT_SECRET is not defined, see .env.example");
}

export const jwtAuth = jwt({
	secret: process.env.JWT_SECRET,
});
