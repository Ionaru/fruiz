import { drizzle } from "drizzle-orm/node-sqlite";
import { dbName } from "./config.ts";
import { relations } from "./relations.ts";

export const db = drizzle(dbName, {
  relations,
});

export type DB = typeof db;
