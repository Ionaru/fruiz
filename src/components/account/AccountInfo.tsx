export interface AccountInfoProps {
  username: string;
  isAdmin?: boolean;
}

export function AccountInfo(props: Readonly<AccountInfoProps>) {
  return (
    <div class="space-y-3">
      <h1 class="text-2xl font-semibold text-base-900 dark:text-base-100">
        Account
      </h1>
      <p class="text-sm opacity-90 text-base-800 dark:text-base-100">
        Signed in as <span class="font-medium">{props.username}</span>
      </p>
      {props.isAdmin && (
        <p
          class="rounded-xl px-3 py-2 text-sm bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100 border border-amber-800/15 dark:border-amber-200/20"
          role="status"
        >
          You are an admin.{" "}
          <a href="/admin" class="underline font-medium text-inherit">
            Admin pages
          </a>
        </p>
      )}
      <a
        href="/collection"
        class="plateau rounded-xl px-4 py-3 text-center no-underline font-medium min-h-11 flex items-center justify-center text-base-900 dark:text-base-100"
      >
        My collection
      </a>
      <a
        href="/suggest"
        class="plateau rounded-xl px-4 py-3 text-center no-underline font-medium min-h-11 flex items-center justify-center text-base-900 dark:text-base-100"
      >
        Suggest a track
      </a>
    </div>
  );
}
