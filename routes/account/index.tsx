import { Head } from "fresh/runtime";
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
  <div class="min-h-screen bg-base-200 dark:bg-base-800 px-4 py-8">
    <Head>
      <title>Account — fruiz</title>
    </Head>
    <nav class="max-w-md mx-auto mb-6" aria-label="Site">
      <a
        href="/"
        class="plateau rounded-full px-4 py-2 text-sm no-underline text-base-900 dark:text-base-100 inline-flex items-center min-h-11"
      >
        Home
      </a>
    </nav>
    {data.mode === "hub"
      ? (
        <div class="max-w-md mx-auto flex flex-col gap-6 plateau rounded-2xl p-6">
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
        </div>
      )
      : (
        <AccountManage
          username={data.username}
          isAdmin={data.isAdmin}
        />
      )}
  </div>
));
