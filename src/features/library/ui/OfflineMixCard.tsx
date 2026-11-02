import { useNavigate } from "react-router-dom";
import { LuShuffle } from "react-icons/lu";
import allOfflineCover from "@/assets/all-offline-cover.svg";
import { playerEngine } from "@/features/player";
import { useTranslation } from "@/languages";
import { useOfflineTracks } from "../hooks/useOfflineTracks";

const MIX_PATH = "/library/offline";

export default function OfflineMixCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tracks, isLoading: loading } = useOfflineTracks();
  const context = t("library.offline_mix.title");

  if (!loading && tracks.length === 0) return null;

  const openMix = () => navigate(MIX_PATH);

  const shuffle = () => {
    if (!tracks.length) return;
    playerEngine.clearQueue();
    void playerEngine.playShuffled(tracks, context);
  };

  return (
    <div
      onClick={openMix}
      className="group flex cursor-pointer flex-col gap-[8px]"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-control">
        <img
          src={allOfflineCover}
          alt=""
          draggable={false}
          className="h-full w-full select-none object-cover"
        />
        <button
          type="button"
          aria-label={t("common.shuffle")}
          title={t("common.shuffle")}
          disabled={loading}
          onClick={(event) => {
            event.stopPropagation();
            shuffle();
          }}
          className="absolute right-[10px] bottom-[10px] flex h-[40px] w-[40px] cursor-pointer items-center justify-center rounded-full border-0 bg-white text-black transition-transform duration-150 ease-out hover:scale-[1.06] active:scale-[0.96] disabled:cursor-default disabled:opacity-60"
        >
          <LuShuffle size={18} />
        </button>
      </div>
      <div className="flex flex-col gap-[4px]">
        <span className="truncate text-label font-[500] text-text-primary">
          {context}
        </span>
        {loading ? (
          <div className="h-[13px] w-[56%] animate-pulse rounded bg-border-alpha-14" />
        ) : (
          <span className="truncate text-body text-text-tertiary">
            {t("common.songs", { count: tracks.length })}
          </span>
        )}
      </div>
    </div>
  );
}
