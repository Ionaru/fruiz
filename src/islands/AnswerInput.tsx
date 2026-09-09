import { useSignal, useSignalEffect } from "@preact/signals";
import { AnswerSuggestionOption } from "../components/quiz/AnswerSuggestionOption.tsx";
import { FieldGroup } from "../components/ui/FieldGroup.tsx";
import { TextInput } from "../components/ui/TextInput.tsx";
import { suggestMatches } from "../lib/guess_match.ts";
import {
  planSuggestionPopup,
  type SuggestionPopupLayout,
  type VisibleBand,
} from "../lib/suggestionPopupLayout.ts";

interface AnswerInputProps {
  instanceId: string;
  suggestions: string[];
  value: string;
  disabled?: boolean;
  /** Field label; defaults to "Your answer" for the quiz. */
  label?: string;
  /** Optional id of helper text for screen readers (e.g. submit gating hint). */
  ariaDescribedBy?: string;
  onValue: (value: string) => void;
}

const MAX_MATCHES = 20;

/** Matches the `mt-2` / `mb-2` the popup is offset from the field by. */
const ANCHOR_GAP = 8;
/** Breathing room kept between the popup and the edge of the visible area. */
const EDGE_CLEARANCE = 8;
/** One option row (`min-h-11`), so a cramped popup shrinks rather than vanishing. */
const MIN_POPUP_HEIGHT = 44;
/**
 * Three option rows. Below this the list is too short to scan, so it is worth
 * covering what sits above the field instead; above it, staying put keeps the
 * clip's play button reachable while the player reads the titles.
 */
const FLIP_BELOW_HEIGHT = MIN_POPUP_HEIGHT * 3;
/** How far a pointer may travel and still count as a tap rather than a scroll. */
const TAP_SLOP = 10;

/**
 * The part of the layout viewport the user can actually see. With the on-screen
 * keyboard up that is a band in the middle of the page, not the whole viewport,
 * and `visualViewport` is the only cross-browser way to learn its size.
 */
function readVisibleBand(): VisibleBand {
  const viewport = globalThis.visualViewport;
  if (!viewport) {
    return { top: 0, height: document.documentElement.clientHeight };
  }
  return { top: viewport.offsetTop, height: viewport.height };
}

export default function AnswerInput(props: Readonly<AnswerInputProps>) {
  const inputId = `answer-${props.instanceId}`;
  const listboxId = `answer-listbox-${props.instanceId}`;
  const optionId = (index: number) => `${listboxId}-opt-${index}`;

  const isOpen = useSignal(false);
  const activeIndex = useSignal(-1);
  const containerEl = useSignal<HTMLDivElement | null>(null);
  const anchorEl = useSignal<HTMLDivElement | null>(null);
  const listboxEl = useSignal<HTMLUListElement | null>(null);
  const popupLayout = useSignal<SuggestionPopupLayout | null>(null);

  // Raw props are not reactive dependencies, so bridge the query into a signal:
  // the popup has to be re-measured as the match list grows and shrinks.
  const query = useSignal(props.value);
  query.value = props.value;

  useSignalEffect(() => {
    if (!isOpen.value) return;
    // A touch that starts outside the popup is far more often a scroll than a
    // dismissal, and closing on `pointerdown` cancels it before the browser can
    // tell the two apart. Wait for `pointerup` and only treat a stationary
    // press as a tap; `pointercancel` means the browser took the gesture over
    // for scrolling, which is never a dismissal.
    let pressedOutsideAt: { x: number; y: number } | null = null;
    const startsOutside = (target: EventTarget | null) => {
      const root = containerEl.value;
      if (!root) return false;
      return !(target instanceof Node) || !root.contains(target);
    };
    const close = () => {
      isOpen.value = false;
      activeIndex.value = -1;
    };
    const onPointerDown = (event: PointerEvent) => {
      pressedOutsideAt = startsOutside(event.target)
        ? { x: event.clientX, y: event.clientY }
        : null;
    };
    const onPointerUp = (event: PointerEvent) => {
      const pressedAt = pressedOutsideAt;
      pressedOutsideAt = null;
      if (!pressedAt || !startsOutside(event.target)) return;
      const travelled = Math.hypot(
        event.clientX - pressedAt.x,
        event.clientY - pressedAt.y,
      );
      if (travelled > TAP_SLOP) return;
      close();
    };
    const onPointerCancel = () => {
      pressedOutsideAt = null;
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerCancel);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerCancel);
    };
  });

  useSignalEffect(() => {
    const anchor = anchorEl.value;
    const listbox = listboxEl.value;
    // Read the query so the popup is re-measured as the match list changes.
    const isMeasurable = isOpen.value && anchor !== null && listbox !== null &&
      query.value !== "";
    if (!isMeasurable) {
      popupLayout.value = null;
      return;
    }
    const measure = () => {
      popupLayout.value = planSuggestionPopup({
        anchor: anchor.getBoundingClientRect(),
        band: readVisibleBand(),
        // `scrollHeight` is the full list height even while `max-height` caps it.
        contentHeight: listbox.scrollHeight,
        minHeight: MIN_POPUP_HEIGHT,
        flipBelowHeight: FLIP_BELOW_HEIGHT,
        anchorGap: ANCHOR_GAP,
        edgeClearance: EDGE_CLEARANCE,
      });
    };
    measure();
    const viewport = globalThis.visualViewport;
    viewport?.addEventListener("resize", measure);
    viewport?.addEventListener("scroll", measure);
    globalThis.addEventListener("resize", measure);
    return () => {
      viewport?.removeEventListener("resize", measure);
      viewport?.removeEventListener("scroll", measure);
      globalThis.removeEventListener("resize", measure);
    };
  });

  useSignalEffect(() => {
    if (!isOpen.value) return;
    const index = activeIndex.value;
    if (index < 0) return;
    const list = listboxEl.value;
    if (!list) return;
    const option = list.children.item(index) as HTMLElement | null;
    option?.scrollIntoView({ block: "nearest" });
  });

  const matches = suggestMatches(props.value, props.suggestions, MAX_MATCHES);
  const expanded = isOpen.value && matches.length > 0;
  const currentActive = activeIndex.value;

  const selectAt = (index: number) => {
    const title = matches[index];
    if (title === undefined) return;
    props.onValue(title);
    isOpen.value = false;
    activeIndex.value = -1;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (props.disabled) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (matches.length === 0) return;
      if (!isOpen.value) isOpen.value = true;
      activeIndex.value = (currentActive + 1) % matches.length;
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (matches.length === 0) return;
      if (!isOpen.value) isOpen.value = true;
      activeIndex.value = currentActive <= 0
        ? matches.length - 1
        : currentActive - 1;
      return;
    }
    if (event.key === "Enter") {
      if (isOpen.value && currentActive >= 0) {
        event.preventDefault();
        selectAt(currentActive);
      }
      return;
    }
    if (event.key === "Escape") {
      if (isOpen.value) {
        event.preventDefault();
        isOpen.value = false;
        activeIndex.value = -1;
      }
      return;
    }
    if (event.key === "Tab") {
      isOpen.value = false;
      activeIndex.value = -1;
    }
  };

  const onInput = (event: Event) => {
    const nextValue = (event.currentTarget as HTMLInputElement).value;
    props.onValue(nextValue);
    activeIndex.value = -1;
    isOpen.value = nextValue.trim() !== "";
  };

  const onFocus = () => {
    if (props.disabled) return;
    if (props.value.trim() === "") return;
    isOpen.value = true;
  };

  const activeDescendant = expanded && currentActive >= 0
    ? optionId(currentActive)
    : undefined;

  // `max-h-60` is the pre-measurement default; once the island has read the
  // visible band the inline `max-height` overrides it, in either direction.
  const layout = popupLayout.value;
  const placementClass = layout?.placement === "above"
    ? "bottom-full mb-2"
    : "top-full mt-2";
  const listboxClass = [
    "absolute left-0 right-0 z-20 plateau rounded-xl p-1",
    placementClass,
    "max-h-60 overflow-y-auto overscroll-contain text-left",
  ].join(" ");

  return (
    <div
      class="flex flex-col gap-2"
      ref={(element) => {
        containerEl.value = element;
      }}
    >
      <FieldGroup label={props.label ?? "Your answer"} htmlFor={inputId} center>
        <div
          class="relative"
          ref={(element) => {
            anchorEl.value = element;
          }}
        >
          <TextInput
            class="text-center"
            id={inputId}
            type="text"
            value={props.value}
            disabled={props.disabled}
            autocomplete="off"
            role="combobox"
            aria-autocomplete="list"
            // Explicit strings for the same reason as the option rows: an
            // ARIA state is a string, and a boolean only survives here
            // because it reaches the input through a spread.
            aria-expanded={expanded ? "true" : "false"}
            aria-controls={listboxId}
            aria-activedescendant={activeDescendant}
            aria-describedby={props.ariaDescribedBy}
            onInput={onInput}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
          />
          {expanded && (
            <ul
              ref={(element) => {
                listboxEl.value = element;
              }}
              id={listboxId}
              role="listbox"
              aria-label="Title suggestions"
              class={listboxClass}
              style={layout
                ? { maxHeight: `${layout.maxHeight}px` }
                : undefined}
            >
              {matches.map((title, index) => (
                <AnswerSuggestionOption
                  key={`${title}-${index}`}
                  id={optionId(index)}
                  title={title}
                  isActive={index === currentActive}
                  onSelect={() => {
                    selectAt(index);
                  }}
                  onHoverActivate={() => {
                    activeIndex.value = index;
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </FieldGroup>
    </div>
  );
}
