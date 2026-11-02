import { memo, type ReactNode } from "react";
import { playerEngine } from "@/features/player";
import SongCardWithMenu from "@/features/player/ui/SongCardWithMenu";
import type { Track } from "@/shared/types";
import { useTranslation } from "@/languages";
import Button from "@/shared/ui/Button";
import SectionHeading from "./SectionHeading";
import type { AiSuggestionsStatus } from "../hooks/useAiSuggestions";

export interface AiSuggestionsSectionProps {
  tracks: Track[];
  status: AiSuggestionsStatus;
  onRefresh: () => void;
  icon?: ReactNode;
  headingMarginTop?: string;
}

function formatDuration(durationMs: number | undefined): string | undefined {
  if (!durationMs) return undefined;
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function AiSuggestionsSection({
  tracks,
  status,
  onRefresh,
  icon,
  headingMarginTop,
}: AiSuggestionsSectionProps) {
  const { t } = useTranslation();

  if (
    status === "need-key" ||
    status === "loading" ||
    status === "empty" ||
    status === "error"
  ) {
    return null;
  }
  if (tracks.length === 0) return null;

  return (
    <section className="flex flex-col">
      <SectionHeading
        title={t("home.ai_suggestions")}
        subtitle={t("home.ai_suggestions_subtitle")}
        icon={icon}
        marginTop={headingMarginTop}
        badge={
          <Button
            variant="secondary"
            onClick={onRefresh}
            className="ml-[8px] !h-[26px] !rounded-[8px] px-[10px] text-[12px]"
          >
            {t("home.ai_suggestions_refresh")}
          </Button>
        }
      />

      <div className="mx-3 mt-[12px] grid grid-flow-col grid-cols-2 grid-rows-5 gap-x-[8px] rounded-[14px] bg-black/[0.03] p-[8px] dark:bg-white/[0.04]">
        {tracks.map((track) => (
          <SongCardWithMenu
            key={track.id}
            id={track.id}
            title={track.title}
            artists={track.artists}
            artistId={track.artistId}
            artistList={track.artistList}
            coverUrl={track.coverUrl}
            duration={formatDuration(track.durationMs)}
            durationMs={track.durationMs}
            explicit={track.explicit}
            onPlay={() =>
              void playerEngine.playTrack(
                track,
                tracks,
                "ai-suggestions",
                track.coverUrl,
              )
            }
          />
        ))}
      </div>
    </section>
  );
}

export default memo(AiSuggestionsSection);
