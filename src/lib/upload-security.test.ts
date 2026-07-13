import { describe, expect, it } from "vitest";
import {
  containsUnsafeOfficePayload,
  containsUnsafePdfActions,
  hasExpectedFileSignature,
} from "./upload-security";

const bytes = (value: string) => new TextEncoder().encode(value);

describe("upload security", () => {
  it("rejects renamed executables and accepts real signatures", () => {
    expect(hasExpectedFileSignature("pdf", bytes("MZ executable"))).toBe(false);
    expect(hasExpectedFileSignature("pdf", bytes("%PDF-1.7"))).toBe(true);
    expect(hasExpectedFileSignature("exe", bytes("MZ executable"))).toBe(false);
    expect(hasExpectedFileSignature("zip", bytes("PK\u0003\u0004 archive"))).toBe(false);
  });

  it("requires the expected Office archive structure", () => {
    expect(hasExpectedFileSignature("docx", bytes("PK\u0003\u0004...[Content_Types].xml...word/document.xml"))).toBe(true);
    expect(hasExpectedFileSignature("docx", bytes("PK\u0003\u0004...random archive"))).toBe(false);
  });

  it("blocks macros, embedded executables and active PDF actions", () => {
    expect(containsUnsafeOfficePayload(bytes("word/vbaProject.bin"))).toBe(true);
    expect(containsUnsafeOfficePayload(bytes("word/embeddings/payload.bin"))).toBe(true);
    expect(containsUnsafePdfActions(bytes("%PDF-1.7 /JavaScript /JS"))).toBe(true);
    expect(containsUnsafePdfActions(bytes("%PDF-1.7 /Catalog /Pages"))).toBe(false);
  });
});
