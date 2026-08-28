import { Head } from "fresh/runtime";
import { AccountTopNav } from "../../components/layout/AccountTopNav.tsx";
import { PageShell } from "../../components/layout/PageShell.tsx";
import { define } from "../../utils.ts";
import AccountRegistration from "../../islands/AccountRegistration.tsx";

export default define.page(function AccountRegisterPage({ state, url }) {
  return (
    <PageShell>
      <Head>
        <title>Register — fruiz</title>
      </Head>
      <AccountTopNav user={state.session.user} currentPath={url.pathname} />
      <AccountRegistration />
    </PageShell>
  );
});
