import { eq } from "drizzle-orm";

import type { DB } from "../db/db.ts";
import { users } from "../db/schema.ts";

/**
 * Permanently deletes a user account by id.
 *
 * Deleting the `users` row removes all of a player's data: `sessions`,
 * `passkeys` and `collected_tracks` each carry an `onDelete: "cascade"` foreign
 * key on `users.id`. There is no recovery path.
 */
export async function deleteUserAccount(
  userId: string,
  database: DB,
): Promise<void> {
  await database.delete(users).where(eq(users.id, userId));
}
