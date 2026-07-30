import { PDFDocument, degrees, rgb, StandardFonts, PageSizes } from "pdf-lib";

export async function mergePDFs(files: File[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const pdf = await PDFDocument.load(bytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  return mergedPdf.save();
}

export async function splitPDF(
  file: File
): Promise<{ name: string; bytes: Uint8Array }[]> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  const results: { name: string; bytes: Uint8Array }[] = [];
  for (let i = 0; i < pdf.getPageCount(); i++) {
    const singlePage = await PDFDocument.create();
    const [page] = await singlePage.copyPages(pdf, [i]);
    singlePage.addPage(page);
    const saved = await singlePage.save();
    results.push({ name: `page_${i + 1}.pdf`, bytes: saved });
  }
  return results;
}

export async function rotatePDF(
  file: File,
  angle: 90 | 180 | 270
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  pdf.getPages().forEach((page) => {
    page.setRotation(degrees(angle));
  });
  return pdf.save();
}

export async function addPageNumbers(file: File): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  pages.forEach((page, i) => {
    const { width } = page.getSize();
    page.drawText(`${i + 1} / ${pages.length}`, {
      x: width / 2 - 20,
      y: 20,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  });
  return pdf.save();
}

export async function addWatermark(
  file: File,
  text: string
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    page.drawText(text, {
      x: width / 4,
      y: height / 2,
      size: 48,
      font,
      color: rgb(0.7, 0.7, 0.7),
      opacity: 0.35,
      rotate: degrees(45),
    });
  });
  return pdf.save();
}

export async function imagesToPDF(files: File[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const isJpeg =
      file.type === "image/jpeg" || file.name.toLowerCase().endsWith(".jpg");
    const img = isJpeg
      ? await pdf.embedJpg(bytes)
      : await pdf.embedPng(bytes);
    const page = pdf.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    const scale = Math.min(width / img.width, height / img.height);
    const imgWidth = img.width * scale;
    const imgHeight = img.height * scale;
    page.drawImage(img, {
      x: (width - imgWidth) / 2,
      y: (height - imgHeight) / 2,
      width: imgWidth,
      height: imgHeight,
    });
  }
  return pdf.save();
}

export async function extractPages(
  file: File,
  pageNums: number[]
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  const newPdf = await PDFDocument.create();
  const indices = pageNums
    .map((n) => n - 1)
    .filter((n) => n >= 0 && n < pdf.getPageCount());
  const copied = await newPdf.copyPages(pdf, indices);
  copied.forEach((p) => newPdf.addPage(p));
  return newPdf.save();
}

export async function removePages(
  file: File,
  pageNums: number[]
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  const removeSet = new Set(pageNums.map((n) => n - 1));
  const keepIndices = pdf
    .getPageIndices()
    .filter((i) => !removeSet.has(i));
  const newPdf = await PDFDocument.create();
  const copied = await newPdf.copyPages(pdf, keepIndices);
  copied.forEach((p) => newPdf.addPage(p));
  return newPdf.save();
}

// Compress: re-save with minimal options (no encryption overhead)
export async function compressPDF(file: File): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  return pdf.save({ useObjectStreams: true });
}

export function downloadBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadZip(
  files: { name: string; bytes: Uint8Array }[],
  zipName: string
) {
  // For split PDF — download each file individually in sequence
  files.forEach((f) => downloadBytes(f.bytes, f.name));
}

async function loadPdfJs(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      lib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(lib);
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js"));
    document.head.appendChild(script);
  });
}

export async function renderPdfPagesForRedaction(
  file: File
): Promise<{ page: number; dataUrl: string; width: number; height: number }[]> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const total = pdfDoc.numPages;
  const results: { page: number; dataUrl: string; width: number; height: number }[] = [];

  for (let p = 1; p <= total; p++) {
    const page = await pdfDoc.getPage(p);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    results.push({
      page: p,
      dataUrl: canvas.toDataURL("image/jpeg", 0.85),
      width: viewport.width,
      height: viewport.height,
    });
  }

  return results;
}
export async function pdfToJpg(
  file: File,
  onProgress?: (page: number, total: number) => void
): Promise<{ name: string; blob: Blob; page: number }[]> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const total = pdfDoc.numPages;
const results: { name: string; blob: Blob; page: number }[] = [];
  for (let pageNum = 1; pageNum <= total; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        0.92
      );
    });

results.push({ name: `page_${pageNum}.jpg`, blob, page: pageNum });
    onProgress?.(pageNum, total);
  }

  return results;
}

export async function pdfToWord(
  file: File,
  onProgress?: (page: number, total: number) => void
): Promise<Blob> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const total = pdfDoc.numPages;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const content = await page.getTextContent();
    const text = (content.items as { str: string }[])
      .map((item) => item.str)
      .join(" ");
    pageTexts.push(text.trim());
    onProgress?.(pageNum, total);
  }

  return buildDocx(pageTexts, file.name);
}
async function buildDocx(pageTexts: string[], sourceFileName: string): Promise<Blob> {
  const JSZip = await loadJSZip();
  const zip = new JSZip();

  const escXml = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const paragraphs = pageTexts.flatMap((text, idx) => {
    const lines = text.split(/\n+/).filter(Boolean);
    const paras =
      lines.length > 0
        ? lines.map(
          (line) =>
            `<w:p><w:r><w:t xml:space="preserve">${escXml(line)}</w:t></w:r></w:p>`
        )
        : [`<w:p><w:r><w:t></w:t></w:r></w:p>`];

    if (idx < pageTexts.length - 1) {
      paras.push(
        `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`
      );
    }
    return paras;
  });

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs.join("\n    ")}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  zip.file("[Content_Types].xml", contentTypesXml);
  zip.file("_rels/.rels", rootRelsXml);
  zip.file("word/document.xml", documentXml);

  return zip.generateAsync({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

async function loadJSZip(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any)["JSZip"]) {
      resolve((window as any)["JSZip"]);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    script.onload = () => resolve((window as any)["JSZip"]);
    script.onerror = () => reject(new Error("Failed to load JSZip"));
    document.head.appendChild(script);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

export async function removeImageBackground(
  file: File,
  onProgress?: (p: number) => void
): Promise<Blob> {
  const { removeBackground } = await import("@imgly/background-removal");

  const blob = await removeBackground(file, {
    model: "small", // fastest model in v1.7.0
    output: { format: "image/png", quality: 1 },
    progress: (key: string, current: number, total: number) => {
      if (total > 0) onProgress?.(Math.round((current / total) * 100));
    },
  });

  return blob;
}
export interface RedactionBox {
  page: number; // 1-indexed
  x: number; // percentage 0-100 of page width
  y: number; // percentage 0-100 of page height
  width: number; // percentage of page width
  height: number; // percentage of page height
}

export async function redactPDF(
  file: File,
  redactions: RedactionBox[]
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  const pages = pdf.getPages();

  for (const box of redactions) {
    const page = pages[box.page - 1];
    if (!page) continue;
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Convert percentage coords to PDF points
    // PDF origin is bottom-left, our UI origin is top-left — flip Y
    const x = (box.x / 100) * pageWidth;
    const boxWidthPt = (box.width / 100) * pageWidth;
    const boxHeightPt = (box.height / 100) * pageHeight;
    const yFromTop = (box.y / 100) * pageHeight;
    const y = pageHeight - yFromTop - boxHeightPt;

    page.drawRectangle({
      x,
      y,
      width: boxWidthPt,
      height: boxHeightPt,
      color: rgb(0, 0, 0),
      borderColor: rgb(0, 0, 0),
      borderWidth: 0,
    });
  }

  return pdf.save();
}

export interface SignaturePlacement {
  page: number; // 1-indexed
  x: number; // percentage 0-100 of page width
  y: number; // percentage 0-100 of page height
  width: number; // percentage of page width
  text: string;
  fontFamily: string;
}

const SIGNATURE_FONT_URLS: Record<string, string> = {
  "Dancing Script": "https://cdn.jsdelivr.net/fontsource/fonts/dancing-script@latest/latin-700-normal.ttf",
  "Great Vibes": "https://cdn.jsdelivr.net/fontsource/fonts/great-vibes@latest/latin-400-normal.ttf",
  "Pacifico": "https://cdn.jsdelivr.net/fontsource/fonts/pacifico@latest/latin-400-normal.ttf",
  "Sacramento": "https://cdn.jsdelivr.net/fontsource/fonts/sacramento@latest/latin-400-normal.ttf",
  "Allura": "https://cdn.jsdelivr.net/fontsource/fonts/allura@latest/latin-400-normal.ttf",
};

export const SIGNATURE_FONTS = Object.keys(SIGNATURE_FONT_URLS);

export async function signPDF(
  file: File,
  signatures: SignaturePlacement[]
): Promise<Uint8Array> {
  const fontkit = (await import("@pdf-lib/fontkit")).default;
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  pdf.registerFontkit(fontkit);

  // Cache embedded fonts so we don't re-fetch per signature
  const fontCache: Record<string, import("pdf-lib").PDFFont> = {};

  for (const sig of signatures) {
    const page = pdf.getPages()[sig.page - 1];
    if (!page) continue;
    const { width: pageWidth, height: pageHeight } = page.getSize();

    if (!fontCache[sig.fontFamily]) {
      const fontUrl = SIGNATURE_FONT_URLS[sig.fontFamily];
      const fontBytes = await fetch(fontUrl).then((r) => r.arrayBuffer());
      fontCache[sig.fontFamily] = await pdf.embedFont(fontBytes);
    }
    const font = fontCache[sig.fontFamily];

    const fontSize = (sig.width / 100) * pageWidth * 0.14; // scale text to box width
    const x = (sig.x / 100) * pageWidth;
    const yFromTop = (sig.y / 100) * pageHeight;
    const y = pageHeight - yFromTop - fontSize;

    page.drawText(sig.text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.1, 0.1, 0.35),
    });
  }

  return pdf.save();
}

export async function wordToPdf(file: File): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/word-to-pdf", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Conversion failed" }));
    throw new Error(err.error || "Conversion failed");
  }

  const html = await response.text();

  const printWindow = window.open("", "_blank");
  if (!printWindow) throw new Error("Popup blocked — please allow popups for this site");

  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };

  setTimeout(() => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch {
      // already printed
    }
  }, 800);
}

export async function protectPDF(file: File, password: string): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("password", password);

  const response = await fetch("/api/protect-pdf", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Protection failed" }));
    throw new Error(err.error || "Protection failed");
  }

  return response.blob();
}

export type EditElementType = "text" | "image" | "rectangle" | "circle" | "arrow" | "line";

export interface PDFEditElement {
  id: string;
  type: EditElementType;
  page: number;
  x: number;       // percentage 0-100
  y: number;       // percentage 0-100
  width: number;   // percentage
  height: number;  // percentage
  // text
  text?: string;
  fontSize?: number;
  fontColor?: string;
  bold?: boolean;
  italic?: boolean;
  // shape
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  // image
  imageDataUrl?: string;
}

export async function applyPDFEdits(
  file: File,
  elements: PDFEditElement[]
): Promise<Uint8Array> {
  const { PDFDocument, rgb, StandardFonts, degrees } = await import("pdf-lib");
  const fontkit = (await import("@pdf-lib/fontkit")).default;

  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  pdf.registerFontkit(fontkit);

  const pages = pdf.getPages();

  const parseColor = (hex: string) => {
    const h = hex.replace("#", "");
    return rgb(
      parseInt(h.substring(0, 2), 16) / 255,
      parseInt(h.substring(2, 4), 16) / 255,
      parseInt(h.substring(4, 6), 16) / 255
    );
  };

  for (const el of elements) {
    const page = pages[el.page - 1];
    if (!page) continue;
    const { width: pw, height: ph } = page.getSize();

    const x = (el.x / 100) * pw;
    const elW = (el.width / 100) * pw;
    const elH = (el.height / 100) * ph;
    // PDF y is from bottom
    const y = ph - (el.y / 100) * ph - elH;

    if (el.type === "text" && el.text) {
      const font = await pdf.embedFont(
        el.bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica
      );
      const size = el.fontSize ?? 14;
      const color = parseColor(el.fontColor ?? "#000000");
      page.drawText(el.text, { x, y: y + elH / 2, size, font, color });
    }

    if (el.type === "rectangle") {
      page.drawRectangle({
        x, y, width: elW, height: elH,
        color: el.fillColor && el.fillColor !== "transparent"
          ? parseColor(el.fillColor) : undefined,
        borderColor: parseColor(el.strokeColor ?? "#000000"),
        borderWidth: el.strokeWidth ?? 2,
        opacity: el.fillColor === "transparent" ? 0 : 1,
      });
    }

    if (el.type === "circle") {
      page.drawEllipse({
        x: x + elW / 2, y: y + elH / 2,
        xScale: elW / 2, yScale: elH / 2,
        color: el.fillColor && el.fillColor !== "transparent"
          ? parseColor(el.fillColor) : undefined,
        borderColor: parseColor(el.strokeColor ?? "#000000"),
        borderWidth: el.strokeWidth ?? 2,
        opacity: el.fillColor === "transparent" ? 0 : 1,
      });
    }

    if (el.type === "line") {
      page.drawLine({
        start: { x, y: y + elH / 2 },
        end: { x: x + elW, y: y + elH / 2 },
        color: parseColor(el.strokeColor ?? "#000000"),
        thickness: el.strokeWidth ?? 2,
      });
    }

    if (el.type === "image" && el.imageDataUrl) {
      try {
        const isJpeg = el.imageDataUrl.startsWith("data:image/jpeg");
        const base64 = el.imageDataUrl.split(",")[1];
        const imgBytes = Buffer.from(base64, "base64");
        const img = isJpeg
          ? await pdf.embedJpg(imgBytes)
          : await pdf.embedPng(imgBytes);
        page.drawImage(img, { x, y, width: elW, height: elH });
      } catch (e) {
        console.error("Failed to embed image", e);
      }
    }
  }

  return pdf.save();
}

export async function summarizePDF(
  file: File,
  onStage?: (stage: string) => void
): Promise<PDFSummary> {
  // Step 1 — extract text
  onStage?.("Extracting text from PDF…");
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const total = pdfDoc.numPages;

  let fullText = "";
  for (let p = 1; p <= total; p++) {
    const page = await pdfDoc.getPage(p);
    const content = await page.getTextContent();
    const pageText = (content.items as { str: string }[])
      .map((item) => item.str)
      .join(" ");
    fullText += pageText + "\n";
  }

  if (!fullText.trim()) {
    throw new Error(
      "No text found in this PDF. It may be a scanned image-only document."
    );
  }

  // Step 2 — call Anthropic API directly from browser
  onStage?.("AI is analyzing your document…");
  const truncated = fullText.slice(0, 48000);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": "YOUR_API_KEY_HERE",
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-allow-browser": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `Analyze this PDF content from "${file.name}" and return a structured summary.

Return ONLY valid JSON in this exact format, no markdown, no explanation:
{
  "title": "document title or main topic",
  "overview": "2-3 sentence executive summary",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "importantDates": ["any dates or deadlines mentioned, empty array if none"],
  "importantNumbers": ["key figures, amounts, stats, empty array if none"],
  "actionItems": ["action items or next steps, empty array if none"],
  "sentiment": "positive",
  "readingTime": 5,
  "wordCount": 1200
}

PDF Content:
${truncated}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      err?.error?.message ?? "AI summarization failed. Please check your API key."
    );
  }

  const data = await response.json();
  const raw = data.content?.[0]?.text ?? "{}";

  // Clean response — remove markdown fences if present
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  let summary: PDFSummary;
  try {
    summary = JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI response. Please try again.");
  }

  onStage?.("Done!");
  return summary;
}
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
