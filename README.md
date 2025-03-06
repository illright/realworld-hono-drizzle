# ![RealWorld Example App](.github/readme-assets/logo.png)

This a backend for the [RealWorld](https://github.com/gothinkster/realworld) app, also known as Conduit.

This codebase was created to demonstrate a fully fledged backend application built with Hono including CRUD operations, authentication, routing, pagination, and more.

We've gone to great lengths to adhere to the Hono community styleguides & best practices.

For more information on how to this works with other frontends/backends, head over to the [RealWorld](https://github.com/gothinkster/realworld) repo.


# How it works

The application is built with [Hono](https://hono.dev), which means that the code is compatible with Web standards like `Request` and `Response`. Data is stored in an SQLite database (using the [libSQL](https://turso.tech/libsql) driver) and the database operations are performed with [Drizzle](https://orm.drizzle.team/). Incoming data is parsed with [Valibot](https://valibot.dev/), and the correctness of the format of outgoing data is also ensured with Valibot.

[According to the RealWorld specification](https://realworld-docs.netlify.app/specifications/backend/endpoints/), authentication is done with JWT, specified in the Authorization header of a request.

The code consists of six modules in [`src/modules`](./src/modules/), each handling a different part of the RealWorld API:

- `articles` — handles all `/api/articles` routes
- `comments` (located in `src/modules/articles/`) — handles all `/api/articles/:slug/comments` routes
- `profiles` — handles all `/api/profiles` routes
- `users` — handles all `/api/users` routes
- `user` (located in `src/modules/users/`) — handles all `/api/user` routes
- `tags` — handles all `/api/tags` routes

These modules are mostly isolated, but they do reference each other's schemas.

The modules are then attached to their routes in [`factory.ts`](./src/factory.ts) and the factory produces Hono application objects that can be run on many different runtimes.

# Run the backend

## As a standalone application

The simplest way to run the application is through `npm`. You need to have Node.js installed on your machine.

```
npx realworld-hono-drizzle
```

This will start the server on http://localhost:3000 and create a `local.db` SQLite file in the folder that you're running the command from. Refer to [Configuration](#configuration) for available options.

## As a Hono module

The `realworld-hono-drizzle` package default-exports a Hono application that has a simple interface that conforms to Web standards. This lets you easily integrate it into your frontend server. Simply call `.fetch` on the exported application and pass a [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) object as a first argument and the configuration as a second argument. See [Configuration](#configuration) for more explanation.

```js
import { randomBytes } from 'node:crypto'; // or the equivalent in your other runtime
import realWorldApp from 'realworld-hono-drizzle';

const JWT_SECRET = randomBytes(64).toString('base64url');

/** 
 * @param {Request} req 
 * @returns {Promise<Response>}
 */
function handleApiRequest(req) {
  return realWorldApp.fetch(req, { 
    DATABASE_URL: 'file:local.db', 
    JWT_SECRET,
  });
}
```

## From source

You should have Node.js >= 20 and [pnpm](https://pnpm.io/) installed on your machine.

Clone this repository, `cd` into it, then run `pnpm install`, then `pnpm dev`.

# Configuration

The application has three parameters:

- `DATABASE_URL`: Either a local file with the `file:` protocol or a [libSQL](https://turso.tech/libsql)-compatible URL to the SQLite database.
- `JWT_SECRET`: A secret key used to sign and verify JWT tokens.
- (if running standalone or with `pnpm dev`) `PORT`: The port for the server to listen on.

If you're running standalone with `npx realworld-hono-drizzle` or running from source, then you can specify all three parameters as environment variables:

- Directly in the command: `env PORT=4000 npx realworld-hono-drizzle`
- In a `.env` file (see [`.env.example`](.env.example))

If you're running the application as a Hono module, then you should pass the configuration as the second argument to the `.fetch` method. The `PORT` parameter does not apply in this case:

```js
import realWorldApp from 'realworld-hono-drizzle';

realWorldApp.fetch(req, { DATABASE_URL: '<value>', JWT_SECRET: '<value>' });
```

# License

ISC, [explained](https://choosealicense.com/licenses/isc/)
