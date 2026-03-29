import { Head } from "fresh/runtime";
import { AccountTopNav } from "../../components/layout/AccountTopNav.tsx";
import { PageShell } from "../../components/layout/PageShell.tsx";
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

export default define.page<typeof handler>(({ data }) => (
  <PageShell>
    <Head>
      <title>Account — fruiz</title>
    </Head>
    <AccountTopNav />
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
            <a
              href="/account/register"
              class="plateau rounded-xl px-4 py-3 text-center no-underline font-medium min-h-11 flex items-center justify-center text-base-900 dark:text-base-100"
            >
              Register
            </a>
            <a
              href="/account/login"
              class="plateau rounded-xl px-4 py-3 text-center no-underline font-medium min-h-11 flex items-center justify-center text-base-900 dark:text-base-100"
            >
              Sign in
            </a>
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
