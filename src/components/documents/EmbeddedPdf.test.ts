import { describe, expect, it } from "vitest";
import { getSafePdfUrl } from "./EmbeddedPdf";

describe("getSafePdfUrl", () => {
  it("allows only public Vercel Blob HTTPS URLs", () => {
    expect(getSafePdfUrl("https://store.public.blob.vercel-storage.com/file.pdf")).toBe("https://store.public.blob.vercel-storage.com/file.pdf");
    expect(getSafePdfUrl("http://store.public.blob.vercel-storage.com/file.pdf")).toBeNull();
    expect(getSafePdfUrl("https://example.com/file.pdf")).toBeNull();
    expect(getSafePdfUrl("javascript:alert(1)")).toBeNull();
  });
});
