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
 * you navigate, except the two that would link to the page you are already on:
 * home on the home page, and the guest sign-in call to action on the account
 * page it points at.
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
  // at different sizes, so centring their boxes leaves them on visibly
  // different baselines. The row carries the type scale so the clamp below can
  // be written as one line of it.
  //
  // Wrapping is what keeps the wordmark from being ellipsised alongside the
  // tagline: a flex container assigns items to lines at their unshrunk widths
  // and the tagline does not shrink, so it either fits whole beside the whole
  // wordmark or drops to a second line that the one-line clamp hides. The
  // wordmark keeps `truncate` for the widths where it is alone and still does
  // not fit.
  //
  // The clamp is `1lh` rather than the 1.75rem that equals it today, so raising
  // the browser's minimum font size grows the line box instead of shearing the
  // wordmark. `max-h-7` is that 1.75rem, kept for browsers without the unit.
  //
  // Clipping leaves the tagline in the accessibility tree, so it is still
  // announced at the widths where it is not shown.
  const homeBrand = (
    <>
      {logo}
      <div class="flex min-w-0 flex-wrap items-baseline gap-2.5 text-base sm:gap-3 sm:max-h-7 sm:max-h-[1lh] sm:overflow-hidden sm:text-lg">
        <h1 class="min-w-0 truncate font-semibold">
          Musical quiz
        </h1>
        <p class="hidden shrink-0 text-sm opacity-60 sm:block">
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
