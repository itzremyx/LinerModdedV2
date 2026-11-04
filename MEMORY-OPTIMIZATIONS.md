# Liner Memory Optimizations

## Problem
Liner was using 913 MB RAM on startup — unacceptable for a music player.

## Root Causes
1. **PoTokenService loaded at startup** — initializes all YouTube workers + innertube (100+ MB)
2. **No code splitting** — all chunks loaded into memory upfront
3. **No garbage collection** — Chromium leaks grow over time
4. **Unused Electron features** — renderer backgrounding, extra processes

## Solutions Implemented

### 1. Lazy-load PoTokenService (`electron/optimizations/lazy-potoken.ts`)
- PoTokenService now created only when YouTube content is accessed
- Expected saving: **150–200 MB** (innertube + workers)

### 2. Aggressive Code Splitting (`vite.config.ts`)
- Manual chunks for heavy modules (recharts, lucide-react, spotify-api)
- Separate feature chunks (pages load on demand)
- Tree-shaking optimizations
- Expected saving: **80–120 MB**

### 3. Periodic Garbage Collection (`electron/optimizations/memory-killer.ts`)
- Forces V8 GC every 5 minutes
- Prevents memory leaks from accumulating
- Expected saving: **50–100 MB** over time

### 4. Electron Configuration (`electron/optimizations/electron-init.ts`)
- Disable unused features (renderer backgrounding, automation detection)
- V8 code caching enabled
- Max renderer memory limited to 768 MB
- Single renderer process for efficiency

### 5. Build Optimizations
- ASAR packaging with smart unpacking
- Terser minification (3 passes, drop console/debugger)
- CSS code splitting
- Inline only small assets (<4 KB)

## Expected Results
**Before:** 913 MB RAM on startup → **After:** 200–250 MB RAM (80% reduction)

If all features are not immediately used, it could drop to **100–150 MB** with the lazy-loading.

## Build & Test
```bash
# Build with optimizations
pnpm build

# Pack with electron-builder
pnpm electron:build:win

# Monitor memory with DevTools
# Press F12 → Memory tab → Take heap snapshot
```

## Further Optimizations (Future)
- [ ] Lazy-load routes (code-split by feature)
- [ ] Dynamic imports for Heavy UI components (waveform rendering, etc.)
- [ ] SharedArrayBuffer for worker threads
- [ ] Service worker caching for offline assets
- [ ] Reduce Electron version bloat (migrate to Tauri when PoToken is solvable)
