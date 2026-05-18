import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const HOME = homedir();
const cache = new Map<string, string>();

export function findTsProjectRoot(filePath: string): string {
  if (process.env.CLAUDE_TS_LSP_ROOT) {
    return realpathSync(process.env.CLAUDE_TS_LSP_ROOT);
  }

  const realFile = tryRealpath(filePath);
  let isDir = false;
  try { isDir = statSync(realFile).isDirectory(); } catch {}
  const dir = isDir ? realFile : dirname(realFile);

  if (cache.has(dir)) return cache.get(dir)!;

  const root = detectRoot(dir);
  cache.set(dir, root);
  return root;
}

function detectRoot(startDir: string): string {
  const tsconfigDirs: string[] = [];
  let pkgDir: string | null = null;
  let current = startDir;

  while (current !== HOME && current !== "/" && current !== dirname(current)) {
    if (existsSync(join(current, "tsconfig.json"))) {
      tsconfigDirs.push(current);
    }
    if (!pkgDir && existsSync(join(current, "package.json"))) {
      pkgDir = current;
    }
    current = dirname(current);
  }

  if (tsconfigDirs.length === 0) {
    // No tsconfig.json found; try package.json, else start dir
    return tryRealpath(pkgDir ?? startDir);
  }

  // Topmost tsconfig wins (last element = closest to root)
  const topmost = tsconfigDirs.at(-1)!;

  // Verify it's a monorepo root by checking for a "references" array
  if (tsconfigDirs.length > 1 && isReactor(topmost)) {
    return tryRealpath(topmost);
  }

  // Fall back to nearest tsconfig dir (first element)
  return tryRealpath(tsconfigDirs[0]);
}

function isReactor(dir: string): boolean {
  try {
    const tsconfig = readFileSync(join(dir, "tsconfig.json"), "utf8");
    const parsed = JSON.parse(tsconfig) as Record<string, unknown>;
    return Array.isArray(parsed["references"]) && (parsed["references"] as unknown[]).length > 0;
  } catch {
    return false;
  }
}

function tryRealpath(p: string): string {
  try { return realpathSync(p); } catch { return p; }
}
