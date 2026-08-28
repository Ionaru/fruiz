import { Head } from "fresh/runtime";
import { define } from "../../../utils.ts";
import { db } from "../../../db/db.ts";
import { requireAdminSessionOrRedirect } from "../../../lib/adminSession.ts";
import { listSuggestionsForAdmin } from "../../../lib/trackSuggestions.ts";
import { AdminListHeader } from "../../../components/admin/AdminListHeader.tsx";
import { AdminPageShell } from "../../../components/admin/AdminPageShell.tsx";
import { AdminSuggestionListItem } from "../../../components/admin/AdminSuggestionListItem.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const gate = requireAdminSessionOrRedirect(ctx);
    if (gate instanceof Response) return gate;
    const suggestions = await listSuggestionsForAdmin(db);
    return { data: { session: gate.session, suggestions } };
  },
});

export default define.page<typeof handler>(({ data, state, url }) => (
  <AdminPageShell user={state.session.user} currentPath={url.pathname}>
    <Head>
      <title>Suggestions — admin</title>
    </Head>
    <AdminListHeader title="Suggestions" />
    <ul class="flex flex-col gap-2">
      {data.suggestions.map((suggestion) => (
        <AdminSuggestionListItem
          key={suggestion.id}
          id={suggestion.id}
          title={suggestion.title}
          categoryName={suggestion.category.name}
          username={suggestion.user.username}
          status={suggestion.status}
        />
      ))}
    </ul>
    {data.suggestions.length === 0 && (
      <p class="text-sm opacity-80">No suggestions yet.</p>
    )}
  </AdminPageShell>
));
