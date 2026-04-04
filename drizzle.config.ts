import { defineConfig } from "drizzle-kit";

import { dbName } from "./src/db/config.ts";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: dbName,
  },
});
