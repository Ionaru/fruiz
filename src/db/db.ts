import { drizzle } from "drizzle-orm/node-sqlite";
import { dbName } from "./config.ts";
import { relations } from "./relations.ts";

export const db = drizzle(dbName, {
  relations,
  logger: Deno.env.get("FRUIZ_DEBUG") === "true",
});

export type DB = typeof db;
