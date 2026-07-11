import { describe, expect, it } from "vitest";
import { parseBody, safeHttpUrl, safeString } from "./request-validation";

describe("API input helpers", () => {
  it("accepts bounded JSON objects only", async () => {
    expect(await parseBody(new Request("http://local", { method: "POST", body: JSON.stringify({ ok: true }) }))).toEqual({ ok: true });
    expect(await parseBody(new Request("http://local", { method: "POST", body: "[]" }))).toBeNull();
    expect(await parseBody(new Request("http://local", { method: "POST", body: "not-json" }))).toBeNull();
  });

  it("rejects oversized bodies before parsing", async () => {
    const request = new Request("http://local", { method: "POST", body: JSON.stringify({ value: "12345" }) });
    expect(await parseBody(request, 4)).toBeNull();
  });

  it("normalizes strings and only permits http URLs", () => {
    expect(safeString("  hello  ", 10)).toBe("hello");
    expect(safeString("too long", 3)).toBeNull();
    expect(safeHttpUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
  });
});
