import { eq } from "drizzle-orm";

import type { DB } from "../db/db.ts";
import { users } from "../db/schema.ts";

/**
 * Permanently deletes a user account by id.
 *
 * Deleting the `users` row is sufficient to remove all of a player's data:
 * `sessions`, `passkeys`, and `collected_tracks` all carry an
 * `onDelete: "cascade"` foreign key on `users.id`, so SQLite removes them
 * automatically. There is no recovery path — the deletion is irreversible.
 */
export async function deleteUserAccount(
  userId: string,
  database: DB,
): Promise<void> {
  await database.delete(users).where(eq(users.id, userId));
}
