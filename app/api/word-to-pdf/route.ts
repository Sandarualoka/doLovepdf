import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const mammoth = await import("mammoth");
    const { value: html } = await mammoth.convertToHtml(
      { buffer },
      {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
        ],
      }
    );

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.6;
    color: #000;
    background: #fff;
    padding: 2.54cm;
    max-width: 21cm;
    margin: 0 auto;
  }
  h1 { font-size: 18pt; font-weight: bold; margin: 16pt 0 8pt; }
  h2 { font-size: 14pt; font-weight: bold; margin: 14pt 0 6pt; }
  h3 { font-size: 12pt; font-weight: bold; margin: 12pt 0 4pt; }
  p { margin-bottom: 8pt; }
  table { width: 100%; border-collapse: collapse; margin: 10pt 0; }
  td, th { border: 1px solid #999; padding: 4pt 8pt; }
  th { background: #f0f0f0; font-weight: bold; }
  ul, ol { margin: 8pt 0 8pt 20pt; }
  li { margin-bottom: 4pt; }
  strong, b { font-weight: bold; }
  em, i { font-style: italic; }
  u { text-decoration: underline; }
  img { max-width: 100%; height: auto; }
  @page { margin: 2.54cm; size: A4; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>${html}</body>
</html>`;

    return new NextResponse(fullHtml, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("Word to PDF conversion failed:", err);
    return NextResponse.json(
      { error: "Conversion failed. Make sure the file is a valid .docx document." },
      { status: 500 }
    );
  }
}