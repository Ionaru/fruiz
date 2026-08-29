import { FaPlus } from "react-icons/fa6";
import { PillLink } from "../ui/PillLink.tsx";
import { PlateauCard } from "../ui/PlateauCard.tsx";
import { basenameFromAudioUrl } from "../../lib/audioFilePath.ts";

export interface AdminUnlinkedAudioListItemProps {
  /** Repo-relative POSIX path of the audio file, e.g. `data/music/song.mp3`. */
  audioUrl: string;
}

/**
 * One audio file in `data/music` that has no track yet. The link carries the
 * file to the new-track form, which preselects it and prefills the title, so
 * the long audio dropdown never has to be searched for a fresh file.
 */
export function AdminUnlinkedAudioListItem(
  { audioUrl }: Readonly<AdminUnlinkedAudioListItemProps>,
) {
  const fileName = basenameFromAudioUrl(audioUrl);
  return (
    <li>
      <PlateauCard
        padding="none"
        class="rounded-xl px-4 py-3 flex items-center gap-3"
      >
        <span class="flex-1 min-w-0 truncate font-medium">{fileName}</span>
        <PillLink
          href={`/admin/tracks/new?audio=${encodeURIComponent(audioUrl)}`}
          icon={FaPlus}
          variant="success"
          shape="icon-then-pill"
          class="shrink-0"
          title={`Add track for ${fileName}`}
        >
          <span class="sr-only sm:not-sr-only">Add track</span>
        </PillLink>
      </PlateauCard>
    </li>
  );
}
