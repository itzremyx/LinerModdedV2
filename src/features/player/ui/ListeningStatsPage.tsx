import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { useTranslation } from "@/languages";
import {
  clearListeningEntries,
  getListeningEntries,
  getListeningSummary,
  subscribeListeningEntries,
} from "../engine/nowPlayingLog";

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const GOAL_STORAGE_KEY = "liner:stats:weekly-goal";
const DEFAULT_GOAL_MINUTES = 360;

function loadStoredGoal(): number | null {
  try {
    const raw = localStorage.getItem(GOAL_STORAGE_KEY);
    if (raw === null) return DEFAULT_GOAL_MINUTES;
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return DEFAULT_GOAL_MINUTES;
  }
}

async function drawShareCard(input: {
  weekMinutes: number;
  goalMinutes: number | null;
  topTracks: Array<{ title: string; artists: string; plays: number }>;
  labels: { title: string; week: string; goal: string };
}): Promise<void> {
  const width = 1200;
  const height = 630;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#141416");
  gradient.addColorStop(1, "#1f1b2e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, width - 48, height - 48);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "500 26px system-ui, sans-serif";
  ctx.fillText("LINER · " + input.labels.title.toUpperCase(), 72, 110);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 110px system-ui, sans-serif";
  ctx.fillText(String(input.weekMinutes), 72, 240);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "400 34px system-ui, sans-serif";
  ctx.fillText(input.labels.week, 72, 290);

  if (input.goalMinutes !== null) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "500 28px system-ui, sans-serif";
    ctx.fillText(
      `${input.labels.goal} : ${input.weekMinutes} / ${input.goalMinutes} min`,
      72,
      350,
    );
    const barX = 72;
    const barY = 375;
    const barW = width - 144;
    const barH = 16;
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, barH / 2);
    ctx.fill();
    const ratio = Math.min(input.weekMinutes / input.goalMinutes, 1);
    if (ratio > 0) {
      ctx.fillStyle = "#7c6cf0";
      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(barW * ratio, barH), barH, barH / 2);
      ctx.fill();
    }
  }

  let y = 470;
  input.topTracks.slice(0, 3).forEach((track, index) => {
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "500 24px system-ui, sans-serif";
    ctx.fillText(`${index + 1}.`, 72, y);
    ctx.fillStyle = "#ffffff";
    ctx.font = "500 28px system-ui, sans-serif";
    const name =
      track.title.length > 48 ? track.title.slice(0, 48) + "…" : track.title;
    ctx.fillText(name, 116, y);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "400 22px system-ui, sans-serif";
    ctx.fillText(track.artists, 116 + 520, y);
    y += 50;
  });

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("toBlob failed");
  if (
    navigator.clipboard &&
    typeof ClipboardItem !== "undefined" &&
    navigator.clipboard.write
  ) {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return;
  }
  throw new Error("clipboard unavailable");
}

export default function ListeningStatsPage() {
  const { t } = useTranslation();
  const entries = useSyncExternalStore(
    subscribeListeningEntries,
    getListeningEntries,
    () => [],
  );
  const summary = getListeningSummary(entries);
  const maxDailyMinutes = Math.max(...summary.weeklyMinutes, 1);
  const [goalMinutes, setGoalMinutes] = useState<number | null>(loadStoredGoal);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const weekMinutes = useMemo(
    () => summary.weeklyMinutes.reduce((total, m) => total + m, 0),
    [summary.weeklyMinutes],
  );
  const goalProgress =
    goalMinutes !== null ? Math.min(weekMinutes / goalMinutes, 1) : 0;
  const goalReached = goalMinutes !== null && weekMinutes >= goalMinutes;

  const saveGoal = useCallback(() => {
    const value = Number.parseInt(goalDraft, 10);
    if (Number.isFinite(value) && value > 0) {
      setGoalMinutes(value);
      try {
        localStorage.setItem(GOAL_STORAGE_KEY, String(value));
      } catch {
        /* storage unavailable */
      }
    } else {
      setGoalMinutes(null);
      try {
        localStorage.removeItem(GOAL_STORAGE_KEY);
      } catch {
        /* storage unavailable */
      }
    }
    setEditingGoal(false);
  }, [goalDraft]);

  const shareCard = useCallback(async () => {
    try {
      await drawShareCard({
        weekMinutes,
        goalMinutes,
        topTracks: summary.topTracks,
        labels: {
          title: t("stats.title"),
          week: t("stats.this_week"),
          goal: t("stats.goal"),
        },
      });
      setShareMessage(t("stats.share_copied"));
    } catch {
      setShareMessage(t("stats.share_failed"));
    }
  }, [weekMinutes, goalMinutes, summary.topTracks, t]);

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-[28px] px-[32px] py-[38px] text-text-primary">
      <header className="flex flex-wrap items-end justify-between gap-[16px]">
        <div>
          <p className="m-0 mb-[6px] text-[13px] text-text-tertiary">
            {t("stats.eyebrow")}
          </p>
          <h1 className="m-0 text-[32px] font-semibold tracking-tight">
            {t("stats.title")}
          </h1>
          <p className="m-0 mt-[8px] text-[14px] text-text-secondary">
            {t("stats.description")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-[10px]">
          <button
            type="button"
            disabled={entries.length === 0}
            onClick={() => void shareCard()}
            className="rounded-[8px] border border-border-primary bg-bg-panel px-[14px] py-[9px] text-[13px] text-text-secondary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("stats.share")}
          </button>
          <button
            type="button"
            disabled={entries.length === 0}
            onClick={() => clearListeningEntries()}
            className="rounded-[8px] border border-border-primary bg-bg-panel px-[14px] py-[9px] text-[13px] text-text-secondary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("stats.clear_history")}
          </button>
        </div>
      </header>
      {shareMessage && (
        <p className="m-0 -mt-[18px] text-[13px] text-text-tertiary">
          {shareMessage}
        </p>
      )}

      <section
        data-liquid-glass-surface
        className="rounded-[12px] border border-border-primary bg-bg-panel p-[20px]"
      >
        <div className="flex flex-wrap items-center justify-between gap-[12px]">
          <p className="m-0 text-[13px] text-text-tertiary">
            {t("stats.goal")}
          </p>
          {editingGoal ? (
            <div className="flex items-center gap-[8px]">
              <input
                type="number"
                min={5}
                step={5}
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                className="w-[110px] rounded-[8px] border border-border-primary bg-bg-elevated px-[10px] py-[6px] text-[13px] text-text-primary outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={saveGoal}
                className="rounded-[8px] bg-accent px-[12px] py-[7px] text-[13px] font-medium text-white"
              >
                {t("settings.profile.save_changes")}
              </button>
              <button
                type="button"
                onClick={() => setEditingGoal(false)}
                className="rounded-[8px] border border-border-primary px-[12px] py-[7px] text-[13px] text-text-secondary"
              >
                {t("settings.profile.reset_changes")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setGoalDraft(goalMinutes !== null ? String(goalMinutes) : "");
                setEditingGoal(true);
              }}
              className="rounded-[8px] border border-border-primary bg-bg-elevated px-[12px] py-[7px] text-[13px] text-text-secondary transition-colors hover:text-text-primary"
            >
              {goalMinutes !== null
                ? t("stats.goal_edit")
                : t("stats.goal_off")}
            </button>
          )}
        </div>
        {goalMinutes !== null ? (
          <>
            <p className="m-0 mt-[10px] text-[24px] font-semibold tabular-nums">
              {t("stats.goal_progress", {
                done: weekMinutes,
                target: goalMinutes,
              })}
              {goalReached && (
                <span className="ml-[10px] text-[16px] font-medium text-accent">
                  {t("stats.goal_reached")}
                </span>
              )}
            </p>
            <div className="mt-[12px] h-[8px] w-full overflow-hidden rounded-full bg-bg-elevated">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500"
                style={{ width: `${goalProgress * 100}%` }}
              />
            </div>
          </>
        ) : (
          <p className="m-0 mt-[10px] text-[13px] text-text-tertiary">
            {t("stats.goal_off")}
          </p>
        )}
      </section>

      <section className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
        <article
          data-liquid-glass-surface
          className="rounded-[12px] border border-border-primary bg-bg-panel p-[20px]"
        >
          <p className="m-0 text-[13px] text-text-tertiary">
            {t("stats.this_week")}
          </p>
          <p className="m-0 mt-[10px] text-[36px] font-semibold tabular-nums">
            {summary.weeklyMinutes.reduce(
              (total, minutes) => total + minutes,
              0,
            )}
            <span className="ml-[7px] text-[16px] font-normal text-text-secondary">
              {t("stats.minutes")}
            </span>
          </p>
        </article>
        <article
          data-liquid-glass-surface
          className="rounded-[12px] border border-border-primary bg-bg-panel p-[20px]"
        >
          <p className="m-0 text-[13px] text-text-tertiary">
            {t("stats.all_time")}
          </p>
          <p className="m-0 mt-[10px] text-[36px] font-semibold tabular-nums">
            {Math.floor(summary.listenedMs / 3_600_000)}
            <span className="ml-[7px] text-[16px] font-normal text-text-secondary">
              {t("stats.hours")}
            </span>
          </p>
        </article>
      </section>

      <section
        data-liquid-glass-surface
        className="rounded-[12px] border border-border-primary bg-bg-panel p-[20px]"
      >
        <h2 className="m-0 text-[16px] font-medium">
          {t("stats.weekly_activity")}
        </h2>
        <div className="mt-[22px] grid h-[150px] grid-cols-7 items-end gap-[12px]">
          {summary.weeklyMinutes.map((minutes, index) => (
            <div
              key={WEEKDAY_KEYS[index]}
              className="flex h-full flex-col items-center justify-end gap-[8px]"
            >
              <span className="text-[11px] tabular-nums text-text-tertiary">
                {minutes || ""}
              </span>
              <div className="flex h-[105px] w-full items-end overflow-hidden rounded-[5px] bg-bg-elevated">
                <div
                  className="w-full rounded-[5px] bg-accent transition-[height]"
                  style={{
                    height: `${Math.max((minutes / maxDailyMinutes) * 100, minutes ? 4 : 0)}%`,
                  }}
                />
              </div>
              <span className="text-[11px] text-text-tertiary">
                {t(`stats.days.${WEEKDAY_KEYS[index]}`)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section
        data-liquid-glass-surface
        className="rounded-[12px] border border-border-primary bg-bg-panel p-[20px]"
      >
        <h2 className="m-0 text-[16px] font-medium">{t("stats.top_tracks")}</h2>
        {summary.topTracks.length > 0 ? (
          <ol className="m-0 mt-[12px] list-none p-0">
            {summary.topTracks.map((track, index) => (
              <li
                key={track.trackId}
                className="flex items-center gap-[12px] border-b border-border-primary py-[10px] last:border-b-0"
              >
                <span className="w-[20px] text-right text-[12px] tabular-nums text-text-tertiary">
                  {index + 1}
                </span>
                {track.coverUrl ? (
                  <img
                    src={track.coverUrl}
                    alt=""
                    className="h-[40px] w-[40px] rounded-[5px] object-cover"
                  />
                ) : (
                  <div className="h-[40px] w-[40px] rounded-[5px] bg-bg-elevated" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-[13px] font-medium">
                    {track.title}
                  </p>
                  <p className="m-0 mt-[3px] truncate text-[12px] text-text-tertiary">
                    {track.artists}
                  </p>
                </div>
                <span className="shrink-0 text-[12px] tabular-nums text-text-tertiary">
                  {track.plays} {t("stats.plays")}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="m-0 mt-[12px] text-[13px] text-text-tertiary">
            {t("stats.empty")}
          </p>
        )}
      </section>
    </div>
  );
}
