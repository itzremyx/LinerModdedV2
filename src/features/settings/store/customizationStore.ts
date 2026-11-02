import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { usePageBackdropStore } from "@/shared/lib";

const CUSTOM_BACKGROUND_KEY = "liner:custom-background:v1";
const LIQUID_GLASS_KEY = "liner:liquid-glass:v1";
const COMPACT_MODE_KEY = "liner:compact-mode:v1";

function getStoredCustomBackground(): string {
  if (typeof localStorage === "undefined") return "";
  try {
    return localStorage.getItem(CUSTOM_BACKGROUND_KEY) ?? "";
  } catch {
    return "";
  }
}

function getStoredLiquidGlass(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(LIQUID_GLASS_KEY) === "true";
  } catch {
    return false;
  }
}

function getStoredCompactMode(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(COMPACT_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

const customizationListeners = new Set<() => void>();
const notifyCustomizationListeners = () =>
  customizationListeners.forEach((listener) => listener());
const subscribeCustomization = (listener: () => void) => {
  customizationListeners.add(listener);
  return () => customizationListeners.delete(listener);
};

export function useCustomBackground() {
  return useSyncExternalStore(
    subscribeCustomization,
    getStoredCustomBackground,
    () => "",
  );
}

export function setCustomBackground(dataUrl: string) {
  try {
    if (dataUrl) localStorage.setItem(CUSTOM_BACKGROUND_KEY, dataUrl);
    else localStorage.removeItem(CUSTOM_BACKGROUND_KEY);
    notifyCustomizationListeners();
    return true;
  } catch {
    return false;
  }
}

export function useLiquidGlass() {
  return useSyncExternalStore(
    subscribeCustomization,
    getStoredLiquidGlass,
    () => false,
  );
}

export function setLiquidGlass(enabled: boolean) {
  try {
    localStorage.setItem(LIQUID_GLASS_KEY, String(enabled));
    notifyCustomizationListeners();
  } catch {
    // Keep the current in-memory appearance when storage is unavailable.
  }
}

export function useCompactMode() {
  return useSyncExternalStore(
    subscribeCustomization,
    getStoredCompactMode,
    () => false,
  );
}

export function setCompactMode(enabled: boolean) {
  try {
    localStorage.setItem(COMPACT_MODE_KEY, String(enabled));
    notifyCustomizationListeners();
  } catch {
    // Keep the current in-memory appearance when storage is unavailable.
  }
}

function getIsDarkTheme(): boolean {
  if (typeof document === "undefined") return false;
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark") return true;
  if (attr === "light") return false;
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
  } catch {}
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
}

export function useIsDarkTheme(): boolean {
  const { resolvedTheme } = useTheme();
  return resolvedTheme ? resolvedTheme === "dark" : getIsDarkTheme();
}

export function useEffectiveCoverGlow(): boolean {
  return useIsDarkTheme();
}

export function useHasPageBackdrop(): boolean {
  const coverGlow = useEffectiveCoverGlow();
  const hasCover = usePageBackdropStore((s) => Boolean(s.coverUrl));
  const customBackground = useCustomBackground();
  return coverGlow && (hasCover || Boolean(customBackground));
}
