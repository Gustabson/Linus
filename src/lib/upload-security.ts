export function hasExpectedFileSignature(ext: string, bytes: Uint8Array) {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));

  switch (ext) {
    case "jpg":
    case "jpeg": return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "png": return bytes[0] === 0x89 && ascii(1, 4) === "PNG";
    case "gif": return ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a";
    case "webp": return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    case "pdf": return ascii(0, 5) === "%PDF-";
    case "mp4": return ascii(4, 8) === "ftyp";
    case "webm": return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
    case "docx": {
      const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
      if (!isZip) return false;
      const archiveText = new TextDecoder("latin1").decode(bytes);
      return archiveText.includes("[Content_Types].xml") && archiveText.includes("word/");
    }
    case "pptx": {
      const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
      if (!isZip) return false;
      const archiveText = new TextDecoder("latin1").decode(bytes);
      return archiveText.includes("[Content_Types].xml") && archiveText.includes("ppt/");
    }
    case "txt":
    case "csv": return true;
    default: return false;
  }
}

export function containsUnsafeOfficePayload(bytes: Uint8Array) {
  const archiveText = new TextDecoder("latin1").decode(bytes).toLowerCase();
  return [
    "vbaproject.bin",
    "word/embeddings/",
    "ppt/embeddings/",
    ".exe", ".com", ".scr", ".msi", ".hta",
    ".js", ".vbs", ".ps1", ".bat", ".cmd", ".jar",
  ].some((entry) => archiveText.includes(entry));
}

export function containsUnsafePdfActions(bytes: Uint8Array) {
  const pdfText = new TextDecoder("latin1").decode(bytes).toLowerCase();
  return [
    "/javascript", "/js", "/launch", "/embeddedfile",
    "/openaction", "/submitform", "/richmedia", "/xfa", "/aa",
  ].some((token) => pdfText.includes(token));
}
