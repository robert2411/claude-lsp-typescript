import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

let tmpRoot: string;
let origEnv: string | undefined;

beforeEach(() => {
  tmpRoot = join(tmpdir(), `ctl-test-${Date.now()}`);
  mkdirSync(tmpRoot, { recursive: true });
  origEnv = process.env.CLAUDE_TS_LSP_ROOT;
  delete process.env.CLAUDE_TS_LSP_ROOT;
});

afterEach(() => {
  if (origEnv !== undefined) process.env.CLAUDE_TS_LSP_ROOT = origEnv;
  else delete process.env.CLAUDE_TS_LSP_ROOT;
  try { rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
});

describe("findTsProjectRoot", () => {
  it("finds nearest tsconfig.json for a standalone project", async () => {
    const projectDir = join(tmpRoot, "myproject");
    const srcDir = join(projectDir, "src");
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(projectDir, "tsconfig.json"), JSON.stringify({ compilerOptions: {} }));
    const tsFile = join(srcDir, "index.ts");
    writeFileSync(tsFile, "");

    const { findTsProjectRoot } = await import("../../src/workspace/detect.ts");
    const root = findTsProjectRoot(tsFile);
    expect(root).toBe(projectDir);
  });

  it("finds monorepo root for a project with tsconfig references", async () => {
    const monorepoDir = join(tmpRoot, "monorepo");
    const pkgDir = join(monorepoDir, "packages", "core", "src");
    mkdirSync(pkgDir, { recursive: true });
    mkdirSync(join(monorepoDir, "packages", "core"), { recursive: true });
    writeFileSync(join(monorepoDir, "tsconfig.json"), JSON.stringify({
      references: [{ path: "packages/core" }],
    }));
    writeFileSync(join(monorepoDir, "packages", "core", "tsconfig.json"), JSON.stringify({ compilerOptions: {} }));
    const tsFile = join(pkgDir, "index.ts");
    writeFileSync(tsFile, "");

    const { findTsProjectRoot } = await import("../../src/workspace/detect.ts");
    const root = findTsProjectRoot(tsFile);
    expect(root).toBe(monorepoDir);
  });

  it("falls back to package.json dir when no tsconfig found", async () => {
    const pkgDir = join(tmpRoot, "nots", "src");
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(join(tmpRoot, "nots", "package.json"), JSON.stringify({ name: "myapp" }));
    const file = join(pkgDir, "index.ts");
    writeFileSync(file, "");

    const { findTsProjectRoot } = await import("../../src/workspace/detect.ts");
    const root = findTsProjectRoot(file);
    expect(root).toBe(join(tmpRoot, "nots"));
  });

  it("returns start dir when no tsconfig or package.json found", async () => {
    const dir = join(tmpRoot, "nothing", "src");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, "index.ts");
    writeFileSync(file, "");

    const { findTsProjectRoot } = await import("../../src/workspace/detect.ts");
    const root = findTsProjectRoot(file);
    expect(root).toBe(dir);
  });

  it("uses CLAUDE_TS_LSP_ROOT env var when set", async () => {
    process.env.CLAUDE_TS_LSP_ROOT = tmpRoot;
    const { findTsProjectRoot } = await import("../../src/workspace/detect.ts");
    const result = findTsProjectRoot("/some/random/index.ts");
    expect(result).toBe(tmpRoot);
    delete process.env.CLAUDE_TS_LSP_ROOT;
  });

  it("falls back to nearest tsconfig when topmost has no references", async () => {
    const outer = join(tmpRoot, "outer");
    const inner = join(outer, "inner", "src");
    mkdirSync(inner, { recursive: true });
    // Outer tsconfig has no references — not a reactor
    writeFileSync(join(outer, "tsconfig.json"), JSON.stringify({ compilerOptions: {} }));
    writeFileSync(join(outer, "inner", "tsconfig.json"), JSON.stringify({ compilerOptions: {} }));
    const file = join(inner, "index.ts");
    writeFileSync(file, "");

    const { findTsProjectRoot } = await import("../../src/workspace/detect.ts");
    const root = findTsProjectRoot(file);
    // Should be inner (nearest tsconfig), not outer (no references)
    expect(root).toBe(join(outer, "inner"));
  });

  it("treats unreadable topmost tsconfig as non-reactor (falls back to nearest)", async () => {
    const outer = join(tmpRoot, "outer2");
    const inner = join(outer, "inner", "src");
    mkdirSync(inner, { recursive: true });
    // Make tsconfig.json a directory so readFileSync throws
    mkdirSync(join(outer, "tsconfig.json"), { recursive: true });
    writeFileSync(join(outer, "inner", "tsconfig.json"), JSON.stringify({ compilerOptions: {} }));
    const file = join(inner, "index.ts");
    writeFileSync(file, "");

    const { findTsProjectRoot } = await import("../../src/workspace/detect.ts");
    const root = findTsProjectRoot(file);
    // Topmost "tsconfig.json" is unreadable → isReactor returns false → falls back to nearest
    expect(root).toBe(join(outer, "inner"));
  });
});
