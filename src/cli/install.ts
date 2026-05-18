import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname } from "node:path";
import { execSync } from "node:child_process";
import { CLAUDE_SETTINGS } from "../core/paths.ts";
import { bootstrapLangServer } from "../langserver/bootstrap.ts";
import { findNode } from "../langserver/node.ts";
import { selfCommand } from "../util/self.ts";

async function promptYesNo(question: string, defaultYes = true): Promise<boolean> {
  if (!process.stdin.isTTY) return defaultYes;
  const hint = defaultYes ? "[Y/n]" : "[y/N]";
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`${question} ${hint} `, answer => {
      rl.close();
      const a = answer.trim().toLowerCase();
      resolve(a === "" ? defaultYes : a === "y" || a === "yes");
    });
  });
}

export async function runInstall(args: string[]): Promise<void> {
  const force = args.includes("--force");
  const scope = args.includes("--scope") ? args[args.indexOf("--scope") + 1] : "user";
  const hookOnly = args.includes("--hook-only");
  const noHook = args.includes("--no-hook");

  const self = selfCommand();

  if (hookOnly) {
    console.log("=== claude-typescript-lsp install --hook-only ===\n");
    registerHook(self);
    console.log("\n✓ Hook registered!\n");
    console.log("Restart Claude Code for the hook to take effect.");
    return;
  }

  // 1. Preflight: verify Node
  console.log("=== claude-typescript-lsp install ===\n");

  let nodeBin: string;
  try {
    nodeBin = findNode();
    console.log(`✓ Node.js (≥18): ${nodeBin}`);
  } catch (err) {
    console.error(`✗ ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  // 2. Bootstrap language server
  console.log("\nBootstrapping typescript-language-server…");
  try {
    const layout = await bootstrapLangServer(force);
    console.log(`✓ typescript-language-server: ${layout.bin}`);
  } catch (err) {
    console.error(`✗ bootstrap failed: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  // 3. Resolve our command
  console.log(`\n✓ Binary: ${self}`);

  // 4. Optionally register PostToolUse hook
  const installHook = await resolveHookInstall(noHook);

  if (installHook) {
    registerHook(self);
  } else {
    console.log("  Hook skipped. Run `claude-typescript-lsp install --hook-only` later to add it.");
  }

  // 5. Register MCP server
  registerMcp(self, scope);

  // 6. Warm: advise pre-warming if in a TypeScript project
  const cwd = process.cwd();
  if (existsSync(`${cwd}/tsconfig.json`) || existsSync(`${cwd}/package.json`)) {
    console.log(`\nTo pre-warm the language server (avoids cold-start on first edit), run:`);
    console.log(`  ${self} warm "${cwd}"`);
  } else {
    console.log(`\nTo pre-warm the language server, run:`);
    console.log(`  ${self} warm /path/to/your/typescript/project`);
  }

  console.log("\n✓ Installation complete!\n");
  const needsRestart = installHook ? "hook and MCP server" : "MCP server";
  console.log(`Restart Claude Code for the ${needsRestart} to take effect.`);
}


async function resolveHookInstall(noHook: boolean): Promise<boolean> {
  if (noHook) return false;
  console.log("\nThe PostToolUse hook fires after every TypeScript edit and injects diagnostics");
  console.log("into Claude's context so it can self-correct immediately.");
  return promptYesNo("Install the PostToolUse hook?", true);
}

function registerHook(binaryPath: string): void {
  const hookEntry = {
    matcher: "Edit|Write|MultiEdit",
    hooks: [{ type: "command", command: `${binaryPath} hook`, timeout: 15 }],
  };

  mkdirSync(dirname(CLAUDE_SETTINGS), { recursive: true });

  let settings: Record<string, unknown> = {};
  if (existsSync(CLAUDE_SETTINGS)) {
    try { settings = JSON.parse(readFileSync(CLAUDE_SETTINGS, "utf8")); } catch {}
  }

  const hooks = (settings.hooks as Record<string, unknown[]> | undefined) ?? {};
  const ptu: typeof hookEntry[] = (hooks.PostToolUse as typeof hookEntry[] | undefined) ?? [];

  const matcher = hookEntry.matcher;
  const isOurs = (e: { matcher: string; hooks?: Array<{ command?: string }> }) =>
    e.matcher === matcher && e.hooks?.some(h => h.command?.endsWith(" hook") &&
      (h.command.includes("claude-typescript-lsp") || h.command.includes("index.ts")));

  const filtered = ptu.filter(e => !isOurs(e));
  filtered.push(hookEntry);

  hooks.PostToolUse = filtered;
  settings.hooks = hooks;

  // Atomic write
  const tmp = CLAUDE_SETTINGS + ".tmp";
  writeFileSync(tmp, JSON.stringify(settings, null, 2) + "\n");
  renameSync(tmp, CLAUDE_SETTINGS);

  console.log(`✓ Hook registered in ${CLAUDE_SETTINGS}`);
}

function registerMcp(binaryPath: string, scope: string): void {
  try {
    execSync(
      `claude mcp add --scope ${scope} --transport stdio typescript-lsp -- "${binaryPath}" mcp`,
      { stdio: "pipe" },
    );
    console.log(`✓ MCP server registered (scope: ${scope})`);
  } catch {
    // Fallback: write to ~/.claude.json
    console.log("  (claude CLI not found, writing MCP config directly)");
    const claudeJson = `${process.env.HOME}/.claude.json`;
    let config: Record<string, unknown> = {};
    if (existsSync(claudeJson)) {
      try { config = JSON.parse(readFileSync(claudeJson, "utf8")); } catch {}
    }
    const servers = (config.mcpServers as Record<string, unknown> | undefined) ?? {};
    servers["typescript-lsp"] = { command: binaryPath, args: ["mcp"] };
    config.mcpServers = servers;
    writeFileSync(claudeJson, JSON.stringify(config, null, 2) + "\n");
    console.log(`✓ MCP server written to ${claudeJson}`);
  }
}
