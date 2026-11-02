import { useEffect, useState } from "react";
import { useTranslation } from "@/languages";
import { SettingRow, SettingSection, SettingBlock } from "../controls";
import TextInput from "@/shared/ui/TextInput";
import Button from "@/shared/ui/Button";

interface AiStatus {
  hasKey: boolean;
  encryptionAvailable: boolean;
  baseUrl: string;
}

// The key is stored encrypted by the Electron main process; the renderer
// only ever learns whether one exists, never the value itself.
export function AiTab({ searchQuery }: { searchQuery?: string }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<"" | "saved" | "invalid">("");

  useEffect(() => {
    let alive = true;
    window.linerElectron?.ai
      ?.status()
      ?.then((next) => {
        if (alive) setStatus(next ?? null);
      })
      ?.catch(() => {
        if (alive) setStatus(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  const electronMissing =
    typeof window !== "undefined" && !window.linerElectron;

  const save = async () => {
    setSaving(true);
    setNotice("");
    try {
      const key = draft.trim();
      if (!key && status?.hasKey) {
        await window.linerElectron?.ai?.setKey("");
        setNotice("saved");
        setDraft("");
        setStatus((await window.linerElectron?.ai?.status()) ?? null);
        return;
      }
      const ok = await window.linerElectron?.ai?.setKey(key);
      if (ok) {
        setNotice("saved");
        setDraft("");
        setStatus((await window.linerElectron?.ai?.status()) ?? null);
      } else {
        setNotice("invalid");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-[28px]">
      <SettingSection>
        <SettingBlock
          title={t("settings.ai.key.title")}
          description={t("settings.ai.key.description")}
          titleKey="settings.ai.key.title"
          descKey="settings.ai.key.description"
          searchQuery={searchQuery}
        >
          <SettingRow
            title={t("settings.ai.key.label")}
            titleKey="settings.ai.key.label"
            searchQuery={searchQuery}
            control={
              <div className="flex items-center gap-[8px]">
                <TextInput
                  size="sm"
                  type="password"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={
                    status?.hasKey ? t("settings.ai.key.stored") : "sk-scout-…"
                  }
                  aria-label={t("settings.ai.key.label")}
                  className="!w-[240px]"
                  spellCheck={false}
                  autoComplete="off"
                />
                <Button
                  variant="secondary"
                  disabled={
                    saving ||
                    electronMissing ||
                    (!draft.trim() && !status?.hasKey)
                  }
                  onClick={save}
                  className="!h-[32px] !rounded-[9px] px-[14px]"
                >
                  {saving ? "…" : t("common.save")}
                </Button>
              </div>
            }
          />
          <SettingRow
            title={t("settings.ai.status.title")}
            titleKey="settings.ai.status.title"
            searchQuery={searchQuery}
            control={
              <span className="text-[13px] text-text-secondary">
                {electronMissing
                  ? t("settings.ai.status.desktop_only")
                  : status === null
                    ? "…"
                    : status.hasKey
                      ? t("settings.ai.status.ready")
                      : t("settings.ai.status.missing")}
              </span>
            }
          />
          {status?.baseUrl ? (
            <SettingRow
              title={t("settings.ai.endpoint.title")}
              description={t("settings.ai.endpoint.description")}
              titleKey="settings.ai.endpoint.title"
              descKey="settings.ai.endpoint.description"
              searchQuery={searchQuery}
              control={
                <span className="max-w-[300px] truncate font-mono text-[12px] text-text-tertiary">
                  {status.baseUrl}
                </span>
              }
            />
          ) : null}
        </SettingBlock>
        {notice === "invalid" && (
          <p className="m-0 mt-[8px] text-[13px] text-red-500">
            {t("settings.ai.key.invalid")}
          </p>
        )}
        {notice === "saved" && (
          <p className="m-0 mt-[8px] text-[13px] text-emerald-500">
            {t("settings.ai.key.saved")}
          </p>
        )}
      </SettingSection>

      <SettingSection>
        <SettingRow
          title={t("settings.ai.features.title")}
          description={t("settings.ai.features.description")}
          titleKey="settings.ai.features.title"
          descKey="settings.ai.features.description"
          searchQuery={searchQuery}
          control={null}
        />
      </SettingSection>
    </div>
  );
}
