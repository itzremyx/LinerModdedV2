/**
 * Lazy-load PoTokenService to reduce startup RAM
 * The YouTube workers + innertube are heavy and only needed when playing YouTube
 */
import type { PoTokenService } from "../youtube/potoken.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cached: PoTokenService | null = null;
let loading: Promise<PoTokenService> | null = null;

export async function getPoTokenService(): Promise<PoTokenService> {
  if (cached) return cached;
  if (loading) return loading;

  loading = (async () => {
    // Dynamic import only when needed
    const { PoTokenService } = await import("../youtube/potoken.js");
    cached = new PoTokenService(path.join(__dirname, "../../dist-electron/preload.cjs"));
    return cached;
  })();

  return loading;
}

export function destroyPoTokenService() {
  if (cached) {
    cached.destroy();
    cached = null;
  }
  loading = null;
}
