import Fastify from "fastify";
import { grafserv } from "grafserv/fastify/v4";
import preset from "./graphile.config.mjs";
import schema from "./schema.mjs";

// Create a Koa app
const app = Fastify({
  logger: true,
});
// (Add any Fastify middleware you want here.)

// Create a Grafserv instance
const instance = grafserv({ schema, preset });

// Add the Grafserv instance's route handlers to the Fastify app
instance.addTo(app);

// Start the Fastify server
app.listen({ port: preset.server.port ?? 5678 }, (err, address) => {
  if (err) throw err;
  console.log(`Server is now listening on ${address}`);
});