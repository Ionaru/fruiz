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
  // sitting on visibly different baselines. The row rather than the wordmark
  // carries the type scale, so that the clamp below can be written as one line
  // of it.
  //
  // The wordmark outranks the tagline: the two must never end up ellipsised
  // together. Wrapping is what enforces that, because a flex container assigns
  // items to lines at their unshrunk widths and the tagline does not shrink. It
  // either fits whole beside the whole wordmark or drops to a second line, and
  // clamping the row to one line hides that second line rather than growing the
  // bar. The tagline is therefore shown whole or not at all. The wordmark keeps
  // `truncate` for the narrow screens where it is alone on the line and still
  // does not fit, by which point the tagline is long gone. Below `sm` the
  // tagline is not rendered at all, so nothing can wrap there.
  //
  // The clamp is `1lh`, one line of the row's own text, rather than the 1.75rem
  // that happens to equal it today: raising the browser's minimum font size
  // grows the line box without growing a rem, and a fixed clamp would shear the
  // bottom off the wordmark for the reader who asked for bigger text. `max-h-7`
  // is that 1.75rem, kept in front of it for browsers older than the unit.
  //
  // Clipping leaves the tagline in the accessibility tree, so it is still read
  // out at the widths where it is not shown. That is the better of the two
  // mismatches: it is real copy wherever the bar has room for it, the same way
  // the wordmark stays in the accessible name of the home link when it steps
  // aside off the home page.
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
