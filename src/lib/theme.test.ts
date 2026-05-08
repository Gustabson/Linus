import { describe, it, expect } from "vitest";
import { isValidHex, contrastRatio, validateTheme, buildCustomThemeCSS } from "./theme";

describe("isValidHex", () => {
  it("accepts valid 6-digit hex colors", () => {
    expect(isValidHex("#ffffff")).toBe(true);
    expect(isValidHex("#000000")).toBe(true);
    expect(isValidHex("#15803d")).toBe(true);
    expect(isValidHex("#AABBCC")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidHex("ffffff")).toBe(false);   // sin #
    expect(isValidHex("#fff")).toBe(false);      // 3 dígitos
    expect(isValidHex("#gggggg")).toBe(false);   // caracteres inválidos
    expect(isValidHex("")).toBe(false);
    expect(isValidHex("#12345")).toBe(false);    // 5 dígitos
  });
});

describe("contrastRatio", () => {
  it("black on white has maximum contrast (~21)", () => {
    const ratio = contrastRatio("#000000", "#ffffff");
    expect(ratio).toBeCloseTo(21, 0);
  });

  it("white on white has ratio 1 (no contrast)", () => {
    const ratio = contrastRatio("#ffffff", "#ffffff");
    expect(ratio).toBeCloseTo(1, 1);
  });

  it("is symmetric (order of colors doesn't matter)", () => {
    const r1 = contrastRatio("#000000", "#ffffff");
    const r2 = contrastRatio("#ffffff", "#000000");
    expect(r1).toBeCloseTo(r2, 5);
  });
});

describe("validateTheme", () => {
  it("accepts high-contrast black on white", () => {
    const result = validateTheme({
      themeBg:      "#ffffff",
      themeSurface: "#ffffff",
      themeBorder:  "#e5e7eb",
      themeText:    "#111827",
      themePrimary: "#15803d",
    });
    expect(result).toBeNull();
  });

  it("rejects low-contrast (white on white)", () => {
    const result = validateTheme({
      themeBg:      "#ffffff",
      themeSurface: "#ffffff",
      themeBorder:  "#e5e7eb",
      themeText:    "#ffffff",
      themePrimary: "#15803d",
    });
    expect(result).not.toBeNull();
    expect(result).toContain("contraste");
  });
});

describe("buildCustomThemeCSS", () => {
  it("generates CSS variables for valid hex colors", () => {
    const css = buildCustomThemeCSS({ themeBg: "#f9fafb", themePrimary: "#15803d" });
    expect(css).toContain("--bg: #f9fafb");
    expect(css).toContain("--primary: #15803d");
  });

  it("returns empty string when no valid colors provided", () => {
    expect(buildCustomThemeCSS({})).toBe("");
  });

  it("skips invalid hex values", () => {
    const css = buildCustomThemeCSS({ themeBg: "not-a-color" });
    expect(css).toBe("");
  });
});
