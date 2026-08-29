import { FaList } from "react-icons/fa6";

/**
 * Shown to guests in place of the collection destination, which they have no
 * account to reach yet. It explains what signing in buys rather than just
 * asking them to do it — the header already carries the sign-in action.
 *
 * The icon is styled through a wrapper rather than its own `class` prop:
 * react-icons ships React's prop types, which have no `class`. The svg inherits
 * size and colour from the span.
 */
export function SignInPromptStrip() {
  return (
    <div class="plateau flex items-center gap-3 rounded-[14px] px-3.5 py-3">
      <span class="shrink-0 text-sm text-blue-300">
        <FaList aria-hidden="true" />
      </span>
      <p class="m-0 text-xs opacity-70">
        Sign in with a passkey to keep every track you guess right in a
        collection.
      </p>
    </div>
  );
}
