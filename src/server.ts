import { env } from "./config/env";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { createApp } from "./app";

async function main() {
  await connectDatabase();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`Save State API listening on port ${env.PORT}`);
  });

  async function shutdown() {
    server.close();
    await disconnectDatabase();
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("Failed to start server:", error instanceof Error ? error.message : error);
  process.exit(1);
});
