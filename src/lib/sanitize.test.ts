import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "./sanitize";

describe("sanitizeHtml", () => {
  it("preserves allowed formatting tags", () => {
    const input = "<p><strong>bold</strong> and <em>italic</em></p>";
    expect(sanitizeHtml(input)).toContain("<strong>bold</strong>");
    expect(sanitizeHtml(input)).toContain("<em>italic</em>");
  });

  it("strips script tags", () => {
    const input = '<p>hola</p><script>alert("xss")</script>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
    expect(result).toContain("hola");
  });

  it("strips onerror and onclick attributes", () => {
    const input = '<img src="x" onerror="alert(1)" />';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("<img");
  });

  it("strips javascript: hrefs", () => {
    const input = '<a href="javascript:alert(1)">click</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("javascript:");
  });

  it("rejects protocol-relative links", () => {
    expect(sanitizeHtml('<a href="//evil.example/path">click</a>')).not.toContain("href");
  });

  it("forces external links to open safely", () => {
    const input = '<a href="https://example.com">link</a>';
    const result = sanitizeHtml(input);
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).toContain('target="_blank"');
  });

  it("preserves text-align style", () => {
    const input = '<p style="text-align: center;">centrado</p>';
    const result = sanitizeHtml(input);
    expect(result).toContain("text-align");
    expect(result).toContain("centrado");
  });

  it("strips disallowed style properties", () => {
    const input = '<p style="color: red; font-size: 100px;">texto</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("color");
    expect(result).not.toContain("font-size");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeHtml("")).toBe("");
  });

  it("handles deeply nested malicious content", () => {
    const input = "<div><div><div><script>evil()</script></div></div></div>";
    expect(sanitizeHtml(input)).not.toContain("evil");
  });
});
