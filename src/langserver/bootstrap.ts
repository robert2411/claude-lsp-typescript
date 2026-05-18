import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { SERVER_DIR } from "../core/paths.ts";
import { TS_LANGSERVER_VERSION, TYPESCRIPT_VERSION } from "../core/config.ts";
import { log } from "../core/log.ts";

export interface LangServerLayout {
  bin: string;
}

export function getLangServerLayout(): LangServerLayout | null {
  const bin = join(SERVER_DIR, "node_modules", ".bin", "typescript-language-server");
  if (!existsSync(bin)) return null;
  return { bin };
}

export async function bootstrapLangServer(force = false): Promise<LangServerLayout> {
  if (!force) {
    const existing = getLangServerLayout();
    if (existing) {
      log.info("typescript-language-server already installed");
      return existing;
    }
  }

  mkdirSync(SERVER_DIR, { recursive: true });

  log.info(`Installing typescript-language-server@${TS_LANGSERVER_VERSION} and typescript@${TYPESCRIPT_VERSION}…`);

  try {
    execSync(
      `npm install --prefix "${SERVER_DIR}" --save-exact "typescript-language-server@${TS_LANGSERVER_VERSION}" "typescript@${TYPESCRIPT_VERSION}"`,
      { stdio: "pipe" },
    );
  } catch (err) {
    throw new Error(`npm install failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const layout = getLangServerLayout();
  if (!layout) throw new Error("typescript-language-server installed but binary not found");
  log.info("language server bootstrap complete");
  return layout;
}
