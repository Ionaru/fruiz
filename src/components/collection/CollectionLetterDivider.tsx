export interface CollectionLetterDividerProps {
  /** The divider character itself, already uppercased. */
  letter: string;
  id: string;
}

/**
 * Heading for one alphabetical run of the collection. It names the section for
 * assistive technology as well as sighted readers, so the list is navigable by
 * heading rather than as one flat 241-item run.
 */
export function CollectionLetterDivider(
  props: Readonly<CollectionLetterDividerProps>,
) {
  return (
    <h2
      id={props.id}
      class="ml-1 text-[11px] font-semibold tracking-[0.12em] opacity-35"
    >
      {props.letter}
    </h2>
  );
}
