# claude-typescript-lsp

TypeScript LSP integration for Claude Code. Gives Claude an automatic feedback loop after every TypeScript edit (type errors appear instantly), plus a full set of on-demand navigation tools via MCP.

## How it works

A long-lived **daemon** keeps one `typescript-language-server` process warm per TypeScript project. Two thin clients talk to it:

- **PostToolUse hook** — fires after every Edit/Write/MultiEdit on a `.ts`/`.tsx`/`.mts`/`.cts` file, queries the language server for diagnostics, and injects them into Claude's context so it can self-correct immediately.
- **MCP server** — exposes 8 LSP tools Claude can call on demand (hover, go-to-definition, references, completion, symbols, rename).

## Requirements

- Node.js 18+ (to run `typescript-language-server`)
- TypeScript projects (with `tsconfig.json` or `package.json`)

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/robert2411/claude-lsp-typescript/master/install.sh | bash
```

The script detects your OS and architecture (Linux/macOS, x86-64/ARM64), downloads the right pre-built binary from the [latest release](https://github.com/robert2411/claude-lsp-typescript/releases/latest) to `~/.local/bin`, and runs `install` automatically. No clone or build step needed.

To install to a different directory:

```bash
INSTALL_DIR=/usr/local/bin curl -fsSL https://raw.githubusercontent.com/robert2411/claude-lsp-typescript/master/install.sh | bash
```

`install` will:
1. Verify Node.js 18+ is available
2. Download and cache `typescript-language-server` + `typescript` (~30MB, one-time) via npm
3. Ask whether to register the PostToolUse hook in `~/.claude/settings.json` (optional)
4. Register the MCP server in `~/.claude.json`

Then **restart Claude Code** for the hook and MCP to take effect.

To skip the hook prompt and never install it:

```bash
claude-typescript-lsp install --no-hook
```

To add the hook later (after skipping it during install):

```bash
claude-typescript-lsp install --hook-only
```

## Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/robert2411/claude-lsp-typescript/master/uninstall.sh | bash
```

This removes the hook registration, the MCP server, the language server cache, and the binary. To uninstall without the curl one-liner:

```bash
claude-typescript-lsp uninstall --purge   # remove hook + MCP + language server cache
rm "$(command -v claude-typescript-lsp)"  # remove the binary
```

## Update

```bash
curl -fsSL https://raw.githubusercontent.com/robert2411/claude-lsp-typescript/master/update.sh | bash
```

This downloads the latest binary and replaces the existing one. Your existing configuration (hook, MCP, language server cache) is preserved. Restart Claude Code after updating.

To also force-refresh the language server after updating the binary:

```bash
claude-typescript-lsp install --force
```

## Pre-warm (recommended)

On first run, the language server needs a moment to index the project. Warm it before your first edit so that initial diagnostics are instant:

```bash
claude-typescript-lsp warm /path/to/your/typescript/project
```

After `warm` returns, every subsequent edit in that project returns real diagnostics in under a second.

## MCP tools

| Tool | What it does |
|---|---|
| `typescript_diagnostics` | Compiler + type errors/warnings for a file |
| `typescript_hover` | JSDoc and type signature at a position |
| `typescript_definition` | Go to definition |
| `typescript_references` | Find all references across the workspace |
| `typescript_completion` | Code completion suggestions |
| `typescript_document_symbols` | All symbols in a file (hierarchical) |
| `typescript_workspace_symbols` | Search symbols across the whole project |
| `typescript_rename` | Compute rename edits (returns diffs, doesn't apply them) |

All tools accept 0-based line/character positions and absolute `file_path` values.

## Other commands

```bash
# Check daemon status
claude-typescript-lsp status

# Stop the daemon (it also auto-stops after 30min idle)
claude-typescript-lsp stop

# Force re-install language server
claude-typescript-lsp install --force

# Install only the PostToolUse hook (if you skipped it during install)
claude-typescript-lsp install --hook-only

# Remove hook and MCP registration (keeps binary + language server cache)
claude-typescript-lsp uninstall

# Remove everything including language server cache
claude-typescript-lsp uninstall --purge
```

## Multi-machine setup

Run the same install command on each machine — the script detects the platform automatically:

```bash
curl -fsSL https://raw.githubusercontent.com/robert2411/claude-lsp-typescript/master/install.sh | bash
```

The daemon, language server cache, and workspace data all live under `~/.cache/claude-typescript-lsp/`. The language server is downloaded fresh per machine (~30MB, one-time).

## Development (contributing)

Requires [Bun](https://bun.sh).

```bash
git clone https://github.com/robert2411/claude-lsp-typescript.git && cd claude-lsp-typescript
curl -fsSL https://bun.sh/install | bash && source ~/.bashrc
~/.bun/bin/bun install
```

```bash
# Run without building
~/.bun/bin/bun run src/index.ts <command>

# Typecheck
~/.bun/bin/bun run typecheck

# Unit tests
~/.bun/bin/bun test test/unit

# Build compiled binary for current platform
~/.bun/bin/bun run build
```

## Updating typescript-language-server

Edit `TS_LANGSERVER_VERSION` and `TYPESCRIPT_VERSION` in `src/core/config.ts`, then run `install --force`.

## Environment variables

| Variable | Purpose |
|---|---|
| `CLAUDE_TS_LSP_ROOT` | Override TypeScript workspace root detection |
| `NODE_HOME` | Override the Node.js installation used to run the language server |
| `HOOK_HARD_TIMEOUT_MS` | Max ms the hook waits for diagnostics (default 6000) |
| `SETTLE_MS` | Settle window after last diagnostic publish (default 450) |
| `DAEMON_IDLE_MS` | Auto-shutdown after this many ms idle (default 1800000) |
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error` (default `info`) |
