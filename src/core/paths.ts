import { join } from "node:path";
import { homedir } from "node:os";

const home = homedir();
const xdgCache = process.env.XDG_CACHE_HOME ?? join(home, ".cache");
const xdgRuntime = process.env.XDG_RUNTIME_DIR ?? join(xdgCache, "claude-typescript-lsp", "run");

export const CACHE_DIR = join(xdgCache, "claude-typescript-lsp");
export const SERVER_DIR = join(CACHE_DIR, "server");
export const WORKSPACES_DIR = join(CACHE_DIR, "workspaces");
export const LOGS_DIR = join(CACHE_DIR, "logs");
export const DAEMON_LOG = join(LOGS_DIR, "daemon.log");
export const RUN_DIR = join(xdgRuntime, "claude-typescript-lsp");
export const SOCKET_PATH = join(RUN_DIR, "claude-typescript-lsp.sock");
export const PID_FILE = join(RUN_DIR, "daemon.pid");
export const CLAUDE_SETTINGS = join(home, ".claude", "settings.json");
export const CLAUDE_JSON = join(home, ".claude.json");
