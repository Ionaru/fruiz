import { PillLink } from "../ui/PillLink.tsx";

export function AccountTopNav() {
  return (
    <nav class="max-w-md mx-auto mb-6">
      <PillLink
        href="/"
        class="text-base-900 dark:text-base-100 inline-flex items-center min-h-11"
      >
        Home
      </PillLink>
    </nav>
  );
}
