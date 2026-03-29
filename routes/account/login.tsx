import { Head } from "fresh/runtime";
import { AccountTopNav } from "../../components/layout/AccountTopNav.tsx";
import { PageShell } from "../../components/layout/PageShell.tsx";
import { define } from "../../utils.ts";
import AccountLogin from "../../islands/AccountLogin.tsx";

export default define.page(function AccountLoginPage() {
  return (
    <PageShell>
      <Head>
        <title>Sign in — fruiz</title>
      </Head>
      <AccountTopNav />
      <AccountLogin />
    </PageShell>
  );
});
