import allOfflineCover from "@/assets/all-offline-cover.svg";
import { useTranslation } from "@/languages";
import { useOfflineTracks } from "../hooks/useOfflineTracks";
import { SavedTracksView } from "../saved/ui/SavedLikesPage";

/**
 * Detail page behind the "All offline music" card: every track that plays
 * without a connection, reusing the saved-likes view (virtualised rows,
 * search and sort) so the three offline sources behave as one mix.
 */
export default function OfflineMixPage() {
  const { t } = useTranslation();
  const { tracks, isLoading } = useOfflineTracks();

  return (
    <SavedTracksView
      pageKey="offline-mix"
      title={t("library.offline_mix.title")}
      subtitle={t("library.offline_mix.subtitle")}
      cover={allOfflineCover}
      tracks={tracks}
      isLoading={isLoading}
      emptyTitle={t("library.offline_mix.empty_title")}
      emptySubtitle={t("library.offline_mix.empty_subtitle")}
    />
  );
}
