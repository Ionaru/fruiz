import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import AdminForms from "../../islands/AdminForms.tsx";

export default define.page(function AdminLogin() {
  return (
    <div class="min-h-screen bg-base-200 dark:bg-base-800 px-4 py-8">
      <Head>
        <title>Admin login — fruiz</title>
      </Head>
      <AdminForms />
    </div>
  );
});
