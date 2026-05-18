import { ipcRequest } from "../daemon/autostart.ts";
import { findTsProjectRoot } from "../workspace/detect.ts";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

export async function runWarm(pathArg?: string): Promise<void> {
  const targetPath = pathArg ? resolve(pathArg) : process.cwd();

  if (!existsSync(targetPath)) {
    console.error(`Path not found: ${targetPath}`);
    process.exit(1);
  }

  const root = findTsProjectRoot(targetPath);

  console.log(`Warming typescript-language-server for: ${root}`);
  console.log("This may take a few seconds on first run while tsserver indexes the project…");

  // Send a diagnostics request to trigger session creation and wait for READY
  const dummy = root + "/tsconfig.json";
  const anchor = existsSync(dummy) ? dummy : targetPath;

  let ready = false;
  const start = Date.now();
  const MAX_WAIT = 15_000;

  process.stdout.write("Waiting for language server ready");

  while (!ready && Date.now() - start < MAX_WAIT) {
    try {
      const result = await ipcRequest({ op: "diagnostics", payload: { file_path: anchor } }) as { status: string };
      if (result.status === "ready") {
        ready = true;
      } else {
        process.stdout.write(".");
        await delay(1000);
      }
    } catch {
      process.stdout.write(".");
      await delay(1000);
    }
  }

  process.stdout.write("\n");

  if (ready) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`Ready in ${elapsed}s. First edits will return real diagnostics immediately.`);
  } else {
    console.log("Timed out waiting for language server. It is still indexing in the background.");
    console.log("First edits will return { status: 'indexing' } until it finishes.");
  }
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
