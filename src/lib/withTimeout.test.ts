import { describe, expect, it } from "vitest";
import { withTimeout } from "@/lib/withTimeout";

describe("withTimeout", () => {
  it("returns a result when the operation finishes in time", async () => {
    await expect(withTimeout(Promise.resolve("ready"), 100, "timed out")).resolves.toBe("ready");
  });

  it("rejects when the operation exceeds its deadline", async () => {
    const pending = new Promise<never>(() => {});
    await expect(withTimeout(pending, 5, "request timed out")).rejects.toThrow("request timed out");
  });
});