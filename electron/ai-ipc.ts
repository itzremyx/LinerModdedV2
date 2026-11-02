import {
  app,
  ipcMain,
  net,
  safeStorage,
  type IpcMainInvokeEvent,
} from "electron";
import fs from "node:fs";
import path from "node:path";

// The ScoutCode key never reaches the renderer bundle: it is stored encrypted
// with safeStorage in the main process, and chat calls are made from here.
// Hosted ScoutCode endpoint. Override by setting baseUrl in
// <userData>/ai/config.json (e.g. a local instance on http://localhost:4321/v1).
const DEFAULT_BASE_URL = "https://scoutcode.dev/v1";
const KEY_PREFIX = "sk-scout-";
const MAX_TRACKS = 40;

interface AiConfigFile {
  apiKeyEncrypted?: string;
  baseUrl?: string;
}

interface SuggestTrack {
  title: string;
  artist: string;
}

function isAppUrl(url: string | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("file:")) return true;
  const devServer = process.env.VITE_DEV_SERVER_URL;
  if (!devServer) return false;
  try {
    return new URL(url).origin === new URL(devServer).origin;
  } catch {
    return false;
  }
}

function fromApp(event: IpcMainInvokeEvent): boolean {
  return isAppUrl(event.senderFrame?.url);
}

function configPath(): string {
  return path.join(app.getPath("userData"), "ai", "config.json");
}

function readConfig(): AiConfigFile {
  try {
    return JSON.parse(fs.readFileSync(configPath(), "utf8")) as AiConfigFile;
  } catch {
    return {};
  }
}

function writeConfig(next: AiConfigFile): void {
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(next), "utf8");
}

function readApiKey(): string | null {
  const { apiKeyEncrypted } = readConfig();
  if (!apiKeyEncrypted || !safeStorage.isEncryptionAvailable()) return null;
  try {
    return safeStorage.decryptString(Buffer.from(apiKeyEncrypted, "base64"));
  } catch {
    return null;
  }
}

function status() {
  const config = readConfig();
  return {
    hasKey: Boolean(config.apiKeyEncrypted),
    encryptionAvailable: safeStorage.isEncryptionAvailable(),
    baseUrl: config.baseUrl || DEFAULT_BASE_URL,
  };
}

function sanitizeTracks(input: unknown): SuggestTrack[] {
  if (!Array.isArray(input)) return [];
  const out: SuggestTrack[] = [];
  for (const item of input.slice(0, MAX_TRACKS)) {
    if (!item || typeof item !== "object") continue;
    const title = String((item as SuggestTrack).title ?? "").slice(0, 200);
    const artist = String((item as SuggestTrack).artist ?? "").slice(0, 200);
    if (title) out.push({ title, artist });
  }
  return out;
}

async function chat(
  messages: { role: "system" | "user"; content: string }[],
): Promise<string> {
  const key = readApiKey();
  if (!key) throw new Error("ai:no-key");
  const { baseUrl } = status();
  const res = await net.fetch(
    `${baseUrl.replace(/\/+$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ model: "auto", messages, temperature: 0.7 }),
    },
  );
  if (!res.ok) throw new Error(`ai:http-${res.status}`);
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content ?? "";
}

export function registerAiIpc(): void {
  ipcMain.handle("ai:status", (event) => {
    if (!fromApp(event)) return null;
    return status();
  });

  ipcMain.handle("ai:set-key", (event, input: unknown) => {
    if (!fromApp(event)) return false;
    const key = typeof input === "string" ? input.trim() : "";
    const config = readConfig();
    if (!key) {
      writeConfig({ ...config, apiKeyEncrypted: undefined });
      return true;
    }
    if (!key.startsWith(KEY_PREFIX) || !safeStorage.isEncryptionAvailable()) {
      return false;
    }
    const encrypted = safeStorage.encryptString(key).toString("base64");
    writeConfig({ ...config, apiKeyEncrypted: encrypted });
    return true;
  });

  // Suggests songs the user has not played yet, from their recent listening.
  ipcMain.handle(
    "ai:suggest-tracks",
    async (event, input: { played?: unknown; count?: unknown } | undefined) => {
      if (!fromApp(event)) return [];
      const played = sanitizeTracks(input?.played);
      const count = Math.min(Math.max(Number(input?.count) || 10, 1), 20);
      const history = played
        .map((t) => `- ${t.title}${t.artist ? ` — ${t.artist}` : ""}`)
        .join("\n");
      const content = await chat([
        {
          role: "system",
          content:
            "You recommend music. Reply ONLY with a JSON array of objects with keys title and artist. No prose.",
        },
        {
          role: "user",
          content: `Here is what I listened to recently:\n${history}\n\nSuggest ${count} songs I have NOT listed above, in a similar taste.`,
        },
      ]);
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) return [];
      try {
        return sanitizeTracks(JSON.parse(match[0])).slice(0, count);
      } catch {
        return [];
      }
    },
  );
}
