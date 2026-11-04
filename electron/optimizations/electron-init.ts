/**
 * Electron optimization initialization
 * Must be called before app.whenReady()
 */
import { app } from "electron";
import { setupMemoryKiller } from "./memory-killer.js";

export function setupElectronOptimizations() {
  // Enable V8 code caching for faster loads
  app.commandLine.appendSwitch("enable-v8-code-caching");

  // Disable unused features to save RAM
  app.commandLine.appendSwitch("disable-renderer-backgrounding", "false");
  app.commandLine.appendSwitch("enable-aggressive-domstorage-flushing");

  // GPU optimizations
  app.commandLine.appendSwitch("enable-gpu-rasterization");
  app.commandLine.appendSwitch("enable-zero-copy");

  // Memory: Reduce renderer memory footprint
  app.commandLine.appendSwitch("renderer-process-limit", "1"); // Single renderer per tab group
  app.commandLine.appendSwitch("max-old-space-size", "768"); // V8 heap limit (MB)

  // Network: Disable unused features
  app.commandLine.appendSwitch("disable-blink-features=AutomationControlled");

  // Setup periodic GC every 5 minutes
  setupMemoryKiller(5);

  console.log("[init] Electron optimizations applied");
  console.log("[memory] Available system RAM:", Math.round(require("os").totalmem() / 1024 / 1024 / 1024), "GB");
}
