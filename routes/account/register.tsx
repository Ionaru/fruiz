import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import AccountRegistration from "../../islands/AccountRegistration.tsx";

export default define.page(function AccountRegisterPage() {
  return (
    <div class="min-h-screen bg-base-200 dark:bg-base-800 px-4 py-8">
      <Head>
        <title>Register — fruiz</title>
      </Head>
      <nav class="max-w-md mx-auto mb-6" aria-label="Site">
        <a
          href="/"
          class="plateau rounded-full px-4 py-2 text-sm no-underline text-base-900 dark:text-base-100 inline-flex items-center min-h-11"
        >
          Home
        </a>
      </nav>
      <AccountRegistration />
    </div>
  );
});
