import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { WORKSPACES_DIR } from "../core/paths.ts";
import { sha256String } from "../util/sha256.ts";
import { findNode } from "./node.ts";
import { getLangServerLayout, bootstrapLangServer } from "./bootstrap.ts";
import { LspClient } from "../lsp/client.ts";
import { fileToUri } from "../util/uri.ts";
import { log } from "../core/log.ts";
import type { ChildProcess } from "node:child_process";

export interface LangServerSession {
  proc: ChildProcess;
  client: LspClient;
  rootUri: string;
}

export async function launchLangServer(rootPath: string, logStream: import("node:fs").WriteStream | null): Promise<LangServerSession> {
  let layout = getLangServerLayout();
  if (!layout) {
    log.info("typescript-language-server not found in cache, bootstrapping…");
    layout = await bootstrapLangServer();
  }

  const nodeBin = findNode();

  const workspaceHash = sha256String(rootPath).slice(0, 16);
  const dataDir = join(WORKSPACES_DIR, workspaceHash);
  mkdirSync(dataDir, { recursive: true });

  log.info(`Launching typescript-language-server for ${rootPath}`);
  log.debug(`node: ${nodeBin}, bin: ${layout.bin}`);

  const proc = spawn(nodeBin, [layout.bin, "--stdio"], {
    stdio: ["pipe", "pipe", logStream ? "pipe" : "ignore"],
    cwd: rootPath,
  });

  if (logStream && proc.stderr) {
    proc.stderr.pipe(logStream, { end: false });
  }

  proc.on("exit", code => log.info(`typescript-language-server exited (${code}) for ${rootPath}`));

  const rootUri = fileToUri(rootPath);
  const client = new LspClient(proc);

  await client.initialize(rootUri);

  return { proc, client, rootUri };
}
