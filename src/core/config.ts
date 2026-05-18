export const TS_LANGSERVER_VERSION = "5.2.0";
export const TYPESCRIPT_VERSION = "6.0.3";
export const MIN_NODE_VERSION = 18;

export const DAEMON_IDLE_MS = Number.parseInt(process.env.DAEMON_IDLE_MS ?? "") || 30 * 60 * 1000;
export const READY_TIMEOUT_COLD_MS = Number.parseInt(process.env.READY_TIMEOUT_COLD_MS ?? "") || 10_000;
export const READY_TIMEOUT_HOOK_MS = Number.parseInt(process.env.READY_TIMEOUT_HOOK_MS ?? "") || 8_000;
export const HOOK_HARD_TIMEOUT_MS = Number.parseInt(process.env.HOOK_HARD_TIMEOUT_MS ?? "") || 6_000;
export const SETTLE_MS = Number.parseInt(process.env.SETTLE_MS ?? "") || 450;

export const MAX_DIAGNOSTIC_ENTRIES = 30;
export const MAX_ADDITIONAL_CONTEXT_BYTES = 8_000;
