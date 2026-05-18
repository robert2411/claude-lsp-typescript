import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { MIN_NODE_VERSION } from "../core/config.ts";

export function findNode(): string {
  // Explicit override
  const override = process.env.NODE_HOME;
  if (override) {
    const bin = join(override, "bin", "node");
    const v = nodeVersion(bin);
    if (v && v >= MIN_NODE_VERSION) return bin;
    if (v) throw new Error(`NODE_HOME ${override} is Node ${v}, but typescript-language-server requires Node ${MIN_NODE_VERSION}+.`);
  }

  // PATH node
  const pathNode = nodeVersion("node");
  if (pathNode && pathNode >= MIN_NODE_VERSION) return resolveNodeBin("node") ?? "node";

  // Common installation roots
  for (const candidate of commonNodeRoots()) {
    const bin = join(candidate, "node");
    const v = nodeVersion(bin);
    if (v && v >= MIN_NODE_VERSION) return bin;
  }

  throw new Error(
    `No Node.js ${MIN_NODE_VERSION}+ installation found. Install Node.js ${MIN_NODE_VERSION} or later.`,
  );
}

function commonNodeRoots(): string[] {
  const roots: string[] = [];
  // Common nvm / system locations
  const home = process.env.HOME ?? "";
  const nvmDir = process.env.NVM_DIR ?? join(home, ".nvm");
  if (existsSync(join(nvmDir, "versions", "node"))) {
    roots.push(join(nvmDir, "versions", "node")); // broad fallback; bin/node found below
  }
  if (existsSync("/usr/local/bin")) roots.push("/usr/local/bin");
  if (existsSync("/usr/bin")) roots.push("/usr/bin");
  return roots;
}

function nodeVersion(nodeBin: string): number | null {
  try {
    const out = execSync(`"${nodeBin}" --version 2>&1`, { stdio: "pipe" }).toString().trim();
    const m = /^v(\d+)/.exec(out);
    if (!m) return null;
    return Number.parseInt(m[1]);
  } catch {
    return null;
  }
}

function resolveNodeBin(name: string): string | null {
  try {
    return execSync(`which ${name}`, { stdio: "pipe" }).toString().trim() || null;
  } catch {
    return null;
  }
}
