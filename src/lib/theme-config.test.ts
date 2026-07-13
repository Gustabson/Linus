import { describe, it, expect } from "vitest";
import {
  buildThemeCookie,
  cookieToStyle,
  findThemeCookieValue,
  LEGACY_THEME_COOKIE_NAME,
  parseThemeCookieValue,
  PRESET_LIGHT,
  PRESET_DARK,
  THEME_COOKIE_NAME,
} from "./theme-config";

describe("buildThemeCookie", () => {
  it("maps DB field names to cookie keys", () => {
    const result = buildThemeCookie({ themeBg: "#f9fafb", themePrimary: "#15803d" });
    expect(result).toHaveProperty("bg", "#f9fafb");
    expect(result).toHaveProperty("primary", "#15803d");
  });

  it("ignores empty strings", () => {
    const result = buildThemeCookie({ themeBg: "", themeSurface: "#fff" });
    expect(result).not.toHaveProperty("bg");
    expect(result).toHaveProperty("surface", "#fff");
  });

  it("ignores unknown DB fields", () => {
    const result = buildThemeCookie({ unknownField: "#fff" } as Record<string, string>);
    expect(Object.keys(result)).toHaveLength(0);
  });
});

describe("cookieToStyle", () => {
  it("converts cookie keys to CSS variable map", () => {
    const { htmlStyle } = cookieToStyle({ bg: "#f9fafb", primary: "#15803d" });
    expect(htmlStyle["--bg"]).toBe("#f9fafb");
    expect(htmlStyle["--primary"]).toBe("#15803d");
  });

  it("detects dark mode from mode=dark", () => {
    const { isDark } = cookieToStyle({ mode: "dark" });
    expect(isDark).toBe(true);
  });

  it("isDark is false by default (light or no mode)", () => {
    expect(cookieToStyle({ mode: "light" }).isDark).toBe(false);
    expect(cookieToStyle({}).isDark).toBe(false);
  });

  it("adds derivative variables for border (--border-subtle)", () => {
    const { htmlStyle } = cookieToStyle({ border: "#e5e7eb" });
    expect(htmlStyle["--border-subtle"]).toBe("#e5e7eb");
  });

  it("adds derivative variables for text (muted, subtle)", () => {
    const { htmlStyle } = cookieToStyle({ text: "#111827" });
    expect(htmlStyle["--text-muted"]).toBe("#111827cc");
    expect(htmlStyle["--text-subtle"]).toBe("#11182788");
  });

  it("ignores malformed color values instead of injecting them into CSS", () => {
    const { htmlStyle } = cookieToStyle({ primary: "url(javascript:alert(1))", text: "red" });
    expect(htmlStyle).toEqual({});
  });
});

describe("theme cookie migration", () => {
  const valid = encodeURIComponent(JSON.stringify({ mode: "dark", primary: "#15803d" }));

  it("prefers the current cookie", () => {
    const legacy = encodeURIComponent(JSON.stringify({ mode: "light" }));
    expect(findThemeCookieValue(`${LEGACY_THEME_COOKIE_NAME}=${legacy}; ${THEME_COOKIE_NAME}=${valid}`)).toBe(valid);
  });

  it("falls back to a valid legacy cookie when the current value is malformed", () => {
    expect(findThemeCookieValue(`${THEME_COOKIE_NAME}=broken; ${LEGACY_THEME_COOKIE_NAME}=${valid}`)).toBe(valid);
  });

  it("rejects unknown, empty and malformed payloads", () => {
    expect(parseThemeCookieValue("not-json")).toBeNull();
    expect(parseThemeCookieValue(encodeURIComponent(JSON.stringify({ unknown: "#ffffff" })))).toBeNull();
    expect(parseThemeCookieValue(encodeURIComponent(JSON.stringify([])))).toBeNull();
  });
});

describe("presets", () => {
  it("PRESET_LIGHT has all required keys", () => {
    const required = ["themeBg", "themeSurface", "themeBorder", "themeText", "themePrimary"];
    for (const key of required) {
      expect(PRESET_LIGHT).toHaveProperty(key);
    }
  });

  it("PRESET_DARK has all required keys", () => {
    const required = ["themeBg", "themeSurface", "themeBorder", "themeText", "themePrimary"];
    for (const key of required) {
      expect(PRESET_DARK).toHaveProperty(key);
    }
  });
});
