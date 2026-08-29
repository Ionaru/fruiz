import { FaList } from "react-icons/fa6";

/**
 * Shown to guests in place of the collection destination, which they have no
 * account to reach yet. It explains what signing in buys rather than just
 * asking them to do it — the header already carries the sign-in action.
 */
export function SignInPromptStrip() {
  return (
    <div class="plateau flex items-center gap-3 rounded-[14px] px-3.5 py-3">
      <FaList class="shrink-0 text-sm text-blue-300" aria-hidden="true" />
      <p class="m-0 text-xs opacity-70">
        Sign in with a passkey to keep every track you guess right in a
        collection.
      </p>
    </div>
  );
}
