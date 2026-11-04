/**
 * Aggressive memory management for Electron
 * Periodically triggers garbage collection and clears caches
 */

export function setupMemoryKiller(intervalMinutes: number = 5) {
  const intervalMs = intervalMinutes * 60 * 1000;

  setInterval(() => {
    try {
      // Force garbage collection if V8 inspector is available
      if (global.gc) {
        console.log("[memory] Triggering garbage collection...");
        global.gc();
      }
    } catch (err) {
      console.error("[memory] GC error:", err);
    }
  }, intervalMs);

  console.log(`[memory] Setup periodic GC every ${intervalMinutes} minutes`);
}

export function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    rss: Math.round(usage.rss / 1024 / 1024),
    external: Math.round(usage.external / 1024 / 1024),
  };
}
