import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { debounce } from "../../src/util/debounce.ts";
import { sha256String, sha256File } from "../../src/util/sha256.ts";
import { fileToUri, uriToFile } from "../../src/util/uri.ts";
import { selfArgv, selfCommand } from "../../src/util/self.ts";

describe("debounce", () => {
  it("delays invocation until after quiet period", async () => {
    let count = 0;
    const fn = debounce(() => { count++; }, 40);
    fn(); fn(); fn();
    expect(count).toBe(0);
    await new Promise(r => setTimeout(r, 100));
    expect(count).toBe(1);
  });

  it("resets timer on each call", async () => {
    const calls: number[] = [];
    const fn = debounce((n: number) => { calls.push(n); }, 40);
    fn(1);
    await new Promise(r => setTimeout(r, 20));
    fn(2);
    await new Promise(r => setTimeout(r, 80));
    expect(calls).toEqual([2]);
  });
});

describe("sha256", () => {
  it("sha256String returns correct hex hash", () => {
    const hash = sha256String("hello");
    expect(hash).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  });

  it("sha256String returns different hash for different input", () => {
    expect(sha256String("a")).not.toBe(sha256String("b"));
  });

  it("sha256File hashes file contents", () => {
    const dir = mkdtempSync(join(tmpdir(), "sha256-test-"));
    const file = join(dir, "test.txt");
    writeFileSync(file, "hello");
    const hash = sha256File(file);
    expect(hash).toBe(sha256String("hello"));
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("uri", () => {
  it("fileToUri produces a file:// URI", () => {
    const uri = fileToUri("/tmp");
    expect(uri).toMatch(/^file:\/\//);
  });

  it("uriToFile strips file:// prefix", () => {
    const path = uriToFile("file:///tmp/foo.ts");
    expect(path).toBe("/tmp/foo.ts");
  });

  it("uriToFile decodes percent-encoded characters", () => {
    const path = uriToFile("file:///tmp/my%20file.ts");
    expect(path).toBe("/tmp/my file.ts");
  });

  it("uriToFile returns non-file URIs unchanged", () => {
    const uri = "https://example.com/foo";
    expect(uriToFile(uri)).toBe(uri);
  });
});

describe("selfArgv", () => {
  it("returns two elements when argv[1] is a .ts file", () => {
    const orig = process.argv[1];
    process.argv[1] = "/path/to/script.ts";
    try {
      const argv = selfArgv();
      expect(argv).toHaveLength(2);
      expect(argv[1]).toContain("script.ts");
    } finally {
      process.argv[1] = orig;
    }
  });

  it("returns one element when argv[1] is a compiled binary", () => {
    const orig = process.argv[1];
    process.argv[1] = "/path/to/binary";
    try {
      const argv = selfArgv();
      expect(argv).toHaveLength(1);
    } finally {
      process.argv[1] = orig;
    }
  });

  it("selfCommand returns a non-empty string", () => {
    const cmd = selfCommand();
    expect(typeof cmd).toBe("string");
    expect(cmd.length).toBeGreaterThan(0);
  });
});
