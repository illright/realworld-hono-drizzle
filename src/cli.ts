import "dotenv/config";
import { serve } from "@hono/node-server";

import { object, parse, string } from "valibot";
import { factory } from "./factory.js";

const Environment = object({
	DB_FILE_NAME: string(),
	JWT_SECRET: string(),
});
const env = parse(Environment, process.env);

const app = factory.createApp();

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
	fetch(request, httpBindings) {
		return app.fetch(request, { ...env, ...httpBindings });
	},
	port,
});
