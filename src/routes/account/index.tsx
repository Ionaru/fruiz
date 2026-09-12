import { Head } from "fresh/runtime";
import { AccountTopNav } from "../../components/layout/AccountTopNav.tsx";
import { PageShell } from "../../components/layout/PageShell.tsx";
import { ButtonLink } from "../../components/ui/ButtonLink.tsx";
import { PlateauCard } from "../../components/ui/PlateauCard.tsx";
import { define } from "../../utils.ts";
import AccountManage from "../../islands/AccountManage.tsx";

export const handler = define.handlers({
  GET(ctx) {
    const user = ctx.state.session.user;
    if (user) {
      return {
        data: {
          mode: "manage" as const,
          username: user.username,
          isAdmin: user.admin === true,
        },
      };
    }
    return { data: { mode: "hub" as const } };
  },
});

export default define.page<typeof handler>(({ data, state, url }) => (
  <PageShell>
    <Head>
      <title>Account — fruiz</title>
    </Head>
    <AccountTopNav user={state.session.user} currentPath={url.pathname} />
    {data.mode === "hub"
      ? (
        <PlateauCard class="max-w-md mx-auto flex flex-col gap-6">
          <h1 class="text-2xl font-semibold text-base-900 dark:text-base-100">
            Account
          </h1>
          <p class="text-sm opacity-90 text-base-800 dark:text-base-100">
            Register a new account or sign in with your passkey.
          </p>
          <div class="flex flex-col gap-3">
            <ButtonLink href="/account/register">Register</ButtonLink>
            <ButtonLink href="/account/login">Sign in</ButtonLink>
          </div>
        </PlateauCard>
      )
      : (
        <AccountManage
          username={data.username}
          isAdmin={data.isAdmin}
        />
      )}
  </PageShell>
));
