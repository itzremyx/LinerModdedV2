import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useTranslation, LOCALE_OPTIONS } from "@/languages";
import { MenuSelect, ToggleSwitch } from "@/shared/ui";
import { revealThemeChange } from "@/shared/lib";
import { SettingBlock, SettingRow, SettingSection } from "../controls";
import { ThemeCard } from "./ThemeCard";
import {
  setCompactMode,
  setCustomBackground,
  setLiquidGlass,
  useCompactMode,
  useCustomBackground,
  useLiquidGlass,
} from "../../store/customizationStore";

export function AppearanceTab({ searchQuery }: { searchQuery?: string }) {
  const { t, locale, setLocale } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const customBackground = useCustomBackground();
  const liquidGlass = useLiquidGlass();
  const compactMode = useCompactMode();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackgroundFile = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      context?.drawImage(image, 0, 0, canvas.width, canvas.height);
      const saved = setCustomBackground(canvas.toDataURL("image/jpeg", 0.82));
      if (!saved) window.alert(t("settings.background.storage_error"));
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => URL.revokeObjectURL(objectUrl);
    image.src = objectUrl;
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <SettingSection>
      <SettingRow
        title={t("settings.language.label")}
        description={t("settings.language.description")}
        titleKey="settings.language.label"
        descKey="settings.language.description"
        searchQuery={searchQuery}
        control={
          mounted ? (
            <MenuSelect
              options={LOCALE_OPTIONS}
              value={locale}
              onChange={setLocale}
              className="min-w-[130px]"
              aria-label={t("settings.language.label")}
            />
          ) : (
            <span />
          )
        }
      />

      <SettingBlock
        title={t("settings.theme.title")}
        description={t("settings.theme.description")}
        titleKey="settings.theme.title"
        descKey="settings.theme.description"
        searchQuery={searchQuery}
      >
        {mounted ? (
          <div className="grid grid-cols-3 gap-[10px]">
            {(
              [
                { value: "system", label: t("settings.theme.system") },
                { value: "light", label: t("settings.theme.light") },
                { value: "dark", label: t("settings.theme.dark") },
              ] as const
            ).map((item) => {
              return (
                <ThemeCard
                  key={item.value}
                  mode={item.value}
                  label={item.label}
                  active={theme === item.value}
                  onSelect={(event) =>
                    revealThemeChange(() => setTheme(item.value), {
                      x: event.clientX,
                      y: event.clientY,
                    })
                  }
                />
              );
            })}
          </div>
        ) : null}
      </SettingBlock>

      <SettingRow
        title={t("settings.liquid_glass.title")}
        description={t("settings.liquid_glass.description")}
        titleKey="settings.liquid_glass.title"
        descKey="settings.liquid_glass.description"
        searchQuery={searchQuery}
        control={
          <ToggleSwitch
            checked={liquidGlass}
            onChange={setLiquidGlass}
            ariaLabel={t("settings.liquid_glass.title")}
          />
        }
      />

      <SettingRow
        title={t("settings.compact_mode.title")}
        description={t("settings.compact_mode.description")}
        titleKey="settings.compact_mode.title"
        descKey="settings.compact_mode.description"
        searchQuery={searchQuery}
        control={
          <ToggleSwitch
            checked={compactMode}
            onChange={setCompactMode}
            ariaLabel={t("settings.compact_mode.title")}
          />
        }
      />

      <SettingBlock
        title={t("settings.background.title")}
        description={t("settings.background.description")}
        titleKey="settings.background.title"
        descKey="settings.background.description"
        searchQuery={searchQuery}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleBackgroundFile(event.target.files?.[0])}
        />
        <div className="flex flex-wrap items-center gap-[10px]">
          {customBackground && (
            <img
              src={customBackground}
              alt=""
              aria-hidden="true"
              className="h-[36px] w-[60px] shrink-0 rounded-[8px] border border-border-primary object-cover"
            />
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-[8px] border border-border-primary bg-bg-panel px-[12px] py-[8px] text-[13px] text-text-primary hover:bg-bg-elevated"
          >
            {t("settings.background.choose")}
          </button>
          {customBackground && (
            <button
              type="button"
              onClick={() => setCustomBackground("")}
              className="rounded-[8px] border border-border-primary bg-bg-panel px-[12px] py-[8px] text-[13px] text-text-secondary hover:text-text-primary"
            >
              {t("settings.background.remove")}
            </button>
          )}
        </div>
      </SettingBlock>
    </SettingSection>
  );
}
