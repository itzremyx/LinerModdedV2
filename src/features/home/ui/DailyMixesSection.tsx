import { memo, useState } from "react";
import { GridFill, GridLine } from "@mingcute/react";
import ScrollableRow from "@/shared/ui/ScrollableRow";
import { useTranslation } from "@/languages";
import type { DailyMix } from "../hooks/useDailyMixes";
import DailyMixCard from "./DailyMixCard";
import MixFluidSquare from "./MixFluidSquare";

export interface DailyMixesSectionProps {
  mixes: DailyMix[];
  headingMarginTop?: string;
  accentCoverUrl?: string;
}

const MIX_VIEW_KEY = "liner:home-mixes-view:v1";

function loadMixView(): "row" | "grid" {
  if (typeof localStorage === "undefined") return "row";
  try {
    return localStorage.getItem(MIX_VIEW_KEY) === "grid" ? "grid" : "row";
  } catch {
    return "row";
  }
}

const headingStyle: React.CSSProperties = {
  fontFamily: "var(--font-roboto-flex), sans-serif",
  fontWeight: 564,
  fontVariationSettings:
    "'wght' 564, 'GRAD' 105, 'XOPQ' 100, 'wdth' 134, 'opsz' 144",
};

function DailyMixesSection({
  mixes,
  headingMarginTop = "mt-[22px]",
  accentCoverUrl,
}: DailyMixesSectionProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<"row" | "grid">(loadMixView);
  if (mixes.length === 0) return null;

  const changeView = (next: "row" | "grid") => {
    setView(next);
    try {
      localStorage.setItem(MIX_VIEW_KEY, next);
    } catch {}
  };

  const firstCoverUrl = accentCoverUrl ?? mixes[0]?.coverUrl;

  return (
    <div className="flex flex-col">
      <div
        className={`${headingMarginTop} px-3 flex items-center justify-between`}
      >
        <div className="group flex items-center gap-3">
          <MixFluidSquare coverUrl={firstCoverUrl} />
          <h2
            className="font-roboto-flex-heading text-text-primary text-[36px] m-0 leading-none tracking-tight"
            style={headingStyle}
          >
            {t("home.dailyMixes") || "Your Mixes"}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={t("home.mixes_view_row")}
            aria-pressed={view === "row"}
            title={t("home.mixes_view_row")}
            onClick={() => changeView("row")}
            className={`inline-flex h-[30px] w-[30px] items-center justify-center rounded-md border-none bg-transparent cursor-pointer ${
              view === "row"
                ? "text-text-primary"
                : "text-text-tertiary hover:text-text-primary"
            }`}
          >
            <GridLine size={16} />
          </button>
          <button
            type="button"
            aria-label={t("home.mixes_view_grid")}
            aria-pressed={view === "grid"}
            title={t("home.mixes_view_grid")}
            onClick={() => changeView("grid")}
            className={`inline-flex h-[30px] w-[30px] items-center justify-center rounded-md border-none bg-transparent cursor-pointer ${
              view === "grid"
                ? "text-text-primary"
                : "text-text-tertiary hover:text-text-primary"
            }`}
          >
            <GridFill size={16} />
          </button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(175px,1fr))] gap-[28px] px-3 mt-[12px] pb-[2px]">
          {mixes.map((mix, index) => (
            <DailyMixCard
              key={`daily-mix-${mix.id}-${index}`}
              mix={mix}
              index={index}
            />
          ))}
        </div>
      ) : (
        <ScrollableRow className="flex gap-[28px] pl-3 pr-3 mt-[12px] overflow-x-auto pb-[2px]">
          {mixes.map((mix, index) => (
            <DailyMixCard
              key={`daily-mix-${mix.id}-${index}`}
              mix={mix}
              index={index}
            />
          ))}
        </ScrollableRow>
      )}
    </div>
  );
}

export default memo(DailyMixesSection);
