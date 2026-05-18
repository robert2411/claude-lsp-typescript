import { describe, it, expect, afterEach } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setLogFile, log } from "../../src/core/log.ts";

afterEach(() => {
  setLogFile("");
});

function withLogFile(fn: (logPath: string) => void): string {
  const dir = mkdtempSync(join(tmpdir(), "log-test-"));
  const logPath = join(dir, "out.log");
  try {
    setLogFile(logPath);
    fn(logPath);
    return readFileSync(logPath, "utf8");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("log — stdout/stderr output", () => {
  it("log.info does not throw", () => expect(() => log.info("info message")).not.toThrow());
  it("log.warn does not throw", () => expect(() => log.warn("warn message")).not.toThrow());
  it("log.error does not throw", () => expect(() => log.error("error message")).not.toThrow());
  it("log.debug does not throw", () => expect(() => log.debug("debug message")).not.toThrow());
});

describe("log — file output", () => {
  it("writes to file with message content", () => {
    const content = withLogFile(() => log.info("written to file"));
    expect(content).toContain("written to file");
    expect(content).toContain("[INFO]");
  });

  it("creates nested directories when setLogFile is called", () => {
    const dir = mkdtempSync(join(tmpdir(), "log-test-"));
    const logPath = join(dir, "nested", "logs", "out.log");
    try {
      setLogFile(logPath);
      log.warn("nested dir test");
      expect(readFileSync(logPath, "utf8")).toContain("nested dir test");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("writes WARN level marker", () => {
    expect(withLogFile(() => log.warn("warn to file"))).toContain("[WARN]");
  });

  it("writes ERROR level marker", () => {
    expect(withLogFile(() => log.error("error to file"))).toContain("[ERROR]");
  });

  it("includes ISO timestamp in log entries", () => {
    expect(withLogFile(() => log.info("timestamp check"))).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});
