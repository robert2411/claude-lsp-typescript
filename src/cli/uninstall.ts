import { existsSync, readFileSync, writeFileSync, rmSync, renameSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { CLAUDE_SETTINGS, CLAUDE_JSON, CACHE_DIR } from "../core/paths.ts";

export function runUninstall(args: string[]): void {
  const purge = args.includes("--purge");

  console.log("=== claude-typescript-lsp uninstall ===\n");

  removeHook();
  removeMcp();

  if (purge) {
    removeCache();
  } else {
    console.log(`\nTip: pass --purge to also delete the language server cache at ${CACHE_DIR}`);
  }

  console.log("\n✓ Uninstall complete!\n");
  console.log("Restart Claude Code for the changes to take effect.");
}

function removeHook(): void {
  if (!existsSync(CLAUDE_SETTINGS)) {
    console.log("  Hook: settings.json not found, skipping");
    return;
  }

  let settings: Record<string, unknown> = {};
  try {
    settings = JSON.parse(readFileSync(CLAUDE_SETTINGS, "utf8"));
  } catch {
    console.log("  Hook: could not parse settings.json, skipping");
    return;
  }

  const hooks = settings.hooks as Record<string, unknown[]> | undefined;
  if (!hooks?.PostToolUse) {
    console.log("  Hook: not found in settings.json");
    return;
  }

  type HookEntry = { matcher: string; hooks?: Array<{ command?: string }> };
  const isOurs = (e: HookEntry) =>
    e.matcher === "Edit|Write|MultiEdit" &&
    e.hooks?.some(h => h.command?.endsWith(" hook") &&
      (h.command.includes("claude-typescript-lsp") || h.command.includes("index.ts")));

  const before = (hooks.PostToolUse as HookEntry[]).length;
  hooks.PostToolUse = (hooks.PostToolUse as HookEntry[]).filter(e => !isOurs(e));
  const removed = before - (hooks.PostToolUse as HookEntry[]).length;

  if (removed === 0) {
    console.log("  Hook: not found in settings.json");
    return;
  }

  if ((hooks.PostToolUse as HookEntry[]).length === 0) {
    delete hooks.PostToolUse;
  }
  if (Object.keys(hooks).length === 0) {
    delete settings.hooks;
  }

  const tmp = CLAUDE_SETTINGS + ".tmp";
  writeFileSync(tmp, JSON.stringify(settings, null, 2) + "\n");
  renameSync(tmp, CLAUDE_SETTINGS);
  console.log(`✓ Hook removed from ${CLAUDE_SETTINGS}`);
}

function findBinary(name: string): string | null {
  for (const dir of (process.env.PATH ?? "").split(":")) {
    if (!dir) continue;
    const p = `${dir}/${name}`;
    try { if (existsSync(p)) return p; } catch {}
  }
  return null;
}

function removeMcp(): void {
  const claudePath = findBinary("claude");
  if (claudePath) {
    try {
      execFileSync(claudePath, ["mcp", "remove", "typescript-lsp"], { stdio: "pipe" });
      console.log("✓ MCP server removed via claude CLI");
      return;
    } catch {
      // fall through to manual removal
    }
  }

  if (!existsSync(CLAUDE_JSON)) {
    console.log("  MCP: ~/.claude.json not found, skipping");
    return;
  }

  let config: Record<string, unknown> = {};
  try {
    config = JSON.parse(readFileSync(CLAUDE_JSON, "utf8"));
  } catch {
    console.log("  MCP: could not parse ~/.claude.json, skipping");
    return;
  }

  const servers = config.mcpServers as Record<string, unknown> | undefined;
  if (!servers?.["typescript-lsp"]) {
    console.log("  MCP: typescript-lsp not found in ~/.claude.json");
    return;
  }

  delete servers["typescript-lsp"];
  if (Object.keys(servers).length === 0) {
    delete config.mcpServers;
  }

  writeFileSync(CLAUDE_JSON, JSON.stringify(config, null, 2) + "\n");
  console.log(`✓ MCP server removed from ${CLAUDE_JSON}`);
}

function removeCache(): void {
  if (!existsSync(CACHE_DIR)) {
    console.log(`  Cache: ${CACHE_DIR} not found, skipping`);
    return;
  }
  rmSync(CACHE_DIR, { recursive: true, force: true });
  console.log(`✓ Cache removed: ${CACHE_DIR}`);
}
