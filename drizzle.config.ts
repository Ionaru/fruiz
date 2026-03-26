import { defineConfig } from "drizzle-kit";

import { dbName } from "./db/config.ts";

export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: dbName,
  },
});
