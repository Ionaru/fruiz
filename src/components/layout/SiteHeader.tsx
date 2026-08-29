import { FaHouse, FaList, FaUser, FaUserShield } from "react-icons/fa6";
import { PillLink, type PillShape } from "../ui/PillLink.tsx";
import type { AuthUserSnapshot } from "../../utils.ts";

export interface SiteHeaderProps {
  /** Session user for this request, or `null` for guests. */
  user: AuthUserSnapshot | null;
  /**
   * `url.pathname` of the current request. On the home page the wordmark is the
   * page heading; everywhere else it becomes the link back home.
   */
  currentPath: string;
}

/** Where the destination label is shown rather than only announced. */
type LabelVisibility = "never" | "from-sm" | "always";

const labelShape: Record<LabelVisibility, PillShape> = {
  never: "icon",
  "from-sm": "icon-then-pill",
  always: "pill",
};

const labelClass: Record<LabelVisibility, string | undefined> = {
  never: "sr-only",
  "from-sm": "sr-only sm:not-sr-only",
  always: undefined,
};

/**
 * The destinations stay the same on every page so the bar does not reshuffle as
 * you navigate. The exceptions are the two that would link to the page you are
 * already on: home is dropped on the home page, and the guest sign-in call to
 * action is dropped on the account page it points at. What each visitor sees
 * otherwise depends on their session, but never on which page they are looking
 * at.
 */
export function SiteHeader(props: Readonly<SiteHeaderProps>) {
  const { user, currentPath } = props;
  const isHomePage = currentPath === "/";
  const isAccountPage = currentPath === "/account";
  const logo = (
    <img
      src="/logo.svg"
      width={28}
      height={28}
      alt=""
      class="h-7 w-7 shrink-0"
    />
  );
  // Baseline rather than centre alignment: the wordmark and the tagline are set
  // at different sizes, so centring their boxes leaves the two runs of text
  // sitting on visibly different baselines.
  const homeBrand = (
    <>
      {logo}
      <div class="flex min-w-0 items-baseline gap-2.5 sm:gap-3">
        <h1 class="min-w-0 truncate text-base font-semibold sm:text-lg">
          Musical quiz
        </h1>
        <p class="hidden min-w-0 truncate text-sm opacity-60 sm:block">
          Do you know where the music is from?
        </p>
      </div>
    </>
  );
  // Off the home page the destinations claim more of the bar, so the wordmark
  // steps aside on small screens rather than clipping. `sr-only` keeps it in
  // the accessible name of the link back home.
  const awayBrand = (
    <a href="/" class="flex min-w-0 items-center gap-2.5 no-underline sm:gap-3">
      {logo}
      <span class="sr-only sm:not-sr-only sm:text-lg sm:font-semibold">
        Musical quiz
      </span>
    </a>
  );
  return (
    <header class="plateau flex items-center justify-between gap-3 rounded-full py-2 pl-4 pr-2 sm:gap-4 sm:pl-5 sm:pr-2.5">
      <div class="flex min-w-0 items-center gap-2.5 sm:gap-3">
        {isHomePage ? homeBrand : awayBrand}
      </div>
      <nav class="flex shrink-0 items-center gap-2">
        {!isHomePage && (
          <PillLink
            href="/"
            icon={FaHouse}
            shape={labelShape.never}
            title="Home"
          >
            <span class={labelClass.never}>Home</span>
          </PillLink>
        )}
        {user !== null && (
          <PillLink
            href="/collection"
            icon={FaList}
            shape={labelShape["from-sm"]}
            variant="info"
          >
            <span class={labelClass["from-sm"]}>Collection</span>
          </PillLink>
        )}
        {user?.admin === true && (
          <PillLink
            href="/admin"
            icon={FaUserShield}
            shape={labelShape.never}
            title="Admin"
          >
            <span class={labelClass.never}>Admin</span>
          </PillLink>
        )}
        {user !== null && (
          <PillLink
            href="/account"
            icon={FaUser}
            shape={labelShape.never}
            title="Account"
          >
            <span class={labelClass.never}>Account</span>
          </PillLink>
        )}
        {user === null && !isAccountPage && (
          <PillLink
            href="/account"
            icon={FaUser}
            shape={labelShape.always}
            class="h-11"
          >
            Sign in
          </PillLink>
        )}
      </nav>
    </header>
  );
}
