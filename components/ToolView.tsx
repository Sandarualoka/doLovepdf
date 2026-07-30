"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { Tool } from "@/lib/tools";
import Dropzone from "./Dropzone";
import {
  CompressOptions,
  RotateOptions,
  WatermarkOptions,
  PageRangeOptions,
  PasswordOptions,
} from "./ToolOptions";
import {
  mergePDFs,
  splitPDF,
  rotatePDF,
  addPageNumbers,
  addWatermark,
  imagesToPDF,
  extractPages,
  removePages,
  compressPDF,
  pdfToWord,
  pdfToJpg,
  redactPDF,
  renderPdfPagesForRedaction,
  signPDF,
  wordToPdf,
  applyPDFEdits,
  downloadBytes,
  removeImageBackground,
  downloadBlob,
  downloadZip,
  protectPDF,         
  type RedactionBox,
  type SignaturePlacement,
  type PDFEditElement,
} from "@/lib/pdf-utils";
import RedactEditor from "./RedactEditor";
import SignEditor from "./SignEditor";
import PDFEditor from "./PDFEditor";
import { ArrowLeft, Download, CheckCircle, AlertCircle } from "lucide-react";

type State = "idle" | "processing" | "done" | "error";

interface ToolViewProps {
  tool: Tool;
  onBack: () => void;
}
// ── Load pdfjs from CDN for thumbnail previews ────────────────────────────────
async function loadPdfJsForPreview(): Promise<any> {
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

// ── PDF Page Selector Component ──────────────────────────────────────────────
function PdfPageSelector({
  previews,
  selectedPages,
  onToggle,
  onSelectAll,
  onDeselectAll,
  loading,
  mode = "export",
}: {
  previews: { page: number; dataUrl: string }[];
  selectedPages: Set<number>;
  onToggle: (p: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  loading: boolean;
  mode?: "export" | "remove";
}) {
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem 0" }}>
        <div style={{
          width: 36, height: 36, border: "3px solid #EEF2FF",
          borderTop: "3px solid #4F46E5", borderRadius: "50%",
          margin: "0 auto 12px",
          animation: "spin 0.8s linear infinite",
        }} />
        <p style={{ fontSize: "0.82rem", color: "#6B7280" }}>Generating page previews…</p>
      </div>
    );
  }

  if (!previews.length) return null;

  const isRemoveMode = mode === "remove";

  return (
    <div>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 12,
      }}>
        <div>
          <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#111827" }}>
            {isRemoveMode ? "Select pages to remove" : "Select pages to export"}
          </p>
          <p style={{ fontSize: "0.72rem", color: "#6B7280" }}>
            {selectedPages.size} of {previews.length} page{previews.length !== 1 ? "s" : ""} selected
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={onSelectAll}
            style={{
              fontSize: "0.72rem", padding: "4px 10px",
              border: "1px solid #E5E7EB", borderRadius: 6,
              background: "#fff", cursor: "pointer", color: "#374151",
            }}
          >
            All
          </button>
          <button
            type="button"
            onClick={onDeselectAll}
            style={{
              fontSize: "0.72rem", padding: "4px 10px",
              border: "1px solid #E5E7EB", borderRadius: 6,
              background: "#fff", cursor: "pointer", color: "#374151",
            }}
          >
            None
          </button>
        </div>
      </div>

      {/* Page grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: 14,
        maxHeight: 560,
        padding: "6px 4px",
        overflowY: "auto",
      }}>
        {previews.map(({ page, dataUrl }) => {
          const selected = selectedPages.has(page);
          const selectedColor = isRemoveMode ? "#DC2626" : "#4F46E5";
          const selectedBackground = isRemoveMode ? "#FEF2F2" : "#EEF2FF";
          const selectedShadow = isRemoveMode ? "#FECACA" : "#C7D2FE";

          return (
            <button
              type="button"
              key={page}
              onClick={() => onToggle(page)}
              aria-label={`${selected ? "Deselect" : "Select"} page ${page}`}
              style={{
                padding: 0,
                cursor: "pointer",
                border: `2px solid ${selected ? selectedColor : "#E5E7EB"}`,
                borderRadius: 10,
                overflow: "hidden",
                position: "relative",
                background: "#F9FAFB",
                transition: "all 0.15s",
                boxShadow: selected ? `0 0 0 3px ${selectedShadow}` : "none",
              }}
            >
              {/* Thumbnail */}
              <img
                src={dataUrl}
                alt={`Page ${page}`}
                style={{ width: "100%", display: "block", pointerEvents: "none" }}
              />

              {/* Checkbox overlay */}
              <div style={{
                position: "absolute", top: 6, right: 6,
                width: 20, height: 20, borderRadius: "50%",
                background: selected ? selectedColor : "rgba(255,255,255,0.9)",
                border: `2px solid ${selected ? selectedColor : "#D1D5DB"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.65rem", color: "#fff",
                transition: "all 0.15s",
              }}>
                {selected && "✓"}
              </div>

              {/* Page number */}
              <div style={{
                padding: "4px 0",
                textAlign: "center",
                fontSize: "0.7rem",
                fontWeight: selected ? 600 : 400,
                color: selected ? selectedColor : "#6B7280",
                background: selected ? selectedBackground : "#F9FAFB",
              }}>
                Page {page}
              </div>
            </button>
          );
        })}
      </div>

      {selectedPages.size === 0 && (
        <p style={{
          marginTop: 8, fontSize: "0.75rem",
          color: isRemoveMode ? "#6B7280" : "#DC2626", textAlign: "center",
        }}>
          {isRemoveMode
            ? "Click a page preview to select it for removal"
            : "Select at least one page to export"}
        </p>
      )}

      {isRemoveMode && selectedPages.size === previews.length && (
        <p style={{
          marginTop: 8, fontSize: "0.75rem",
          color: "#DC2626", textAlign: "center",
        }}>
          You cannot remove every page from the PDF
        </p>
      )}
    </div>
  );
}
// ── Merge Preview Component ───────────────────────────────────────────────────
function MergePDFPreview({
  files,
  onReorder,
  onRemove,
}: {
  files: File[];
  onReorder: (from: number, to: number) => void;
  onRemove: (i: number) => void;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const handleDragStart = (i: number) => setDragIdx(i);
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    setOverIdx(i);
  };
  const handleDrop = (i: number) => {
    if (dragIdx !== null && dragIdx !== i) onReorder(dragIdx, i);
    setDragIdx(null);
    setOverIdx(null);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>
          📋 Merge order — drag to reorder
        </p>
        <span style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>
          {files.length} file{files.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {files.map((file, i) => (
          <div
            key={`${file.name}-${i}`}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={() => handleDrop(i)}
            onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              background: overIdx === i ? "#EEF2FF" : "#F9FAFB",
              border: `1.5px solid ${overIdx === i ? "#4F46E5" : dragIdx === i ? "#C7D2FE" : "#E5E7EB"}`,
              borderRadius: 10,
              cursor: "grab",
              transition: "all 0.15s",
              opacity: dragIdx === i ? 0.45 : 1,
            }}
          >
            {/* Order badge */}
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              background: "#4F46E5", color: "#fff",
              fontSize: "0.7rem", fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              {i + 1}
            </div>

            {/* Drag handle */}
            <div style={{ color: "#9CA3AF", fontSize: "0.85rem", cursor: "grab", flexShrink: 0 }}>
              ⠿
            </div>

            {/* File icon */}
            <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>📄</span>

            {/* File info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: "0.82rem", fontWeight: 500, color: "#111827",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {file.name}
              </p>
              <p style={{ fontSize: "0.7rem", color: "#6B7280" }}>
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>

            {/* Remove button */}
            <button
              onClick={() => onRemove(i)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#9CA3AF", fontSize: "1rem", padding: "2px 6px",
                borderRadius: 6, flexShrink: 0,
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = "#DC2626")}
              onMouseOut={(e) => (e.currentTarget.style.color = "#9CA3AF")}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Visual merge arrow */}
      {files.length > 1 && (
        <div style={{
          marginTop: 12, padding: "10px 14px",
          background: "#EEF2FF", borderRadius: 10,
          display: "flex", alignItems: "center", gap: 8,
          fontSize: "0.78rem", color: "#4F46E5", fontWeight: 500,
        }}>
          <span>🔀</span>
          <span>
            Will merge: {files.map((f, i) => (
              <span key={i}>
                <strong>{f.name.replace(/\.pdf$/i, "")}</strong>
                {i < files.length - 1 && <span style={{ color: "#9CA3AF", margin: "0 4px" }}>→</span>}
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}


// ── Split PDF Helper Functions ────────────────────────────────────────────────
function updateSplitRanges(points: Set<number>, totalPages: number): string {
  if (totalPages <= 0) return "";
  const sortedPoints = Array.from(points)
    .filter((p) => p >= 1 && p < totalPages)
    .sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = 1;
  for (const p of sortedPoints) {
    if (start === p) {
      ranges.push(`${start}`);
    } else {
      ranges.push(`${start}-${p}`);
    }
    start = p + 1;
  }
  if (start === totalPages) {
    ranges.push(`${start}`);
  } else {
    ranges.push(`${start}-${totalPages}`);
  }
  return ranges.join(", ");
}

function parseSplitPointsFromRanges(rangesStr: string, totalPages: number): Set<number> {
  const points = new Set<number>();
  if (!rangesStr.trim() || totalPages <= 0) return points;
  const parts = rangesStr.split(",");
  for (const part of parts) {
    const match = part.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (match) {
      const end = match[2] ? parseInt(match[2]) : parseInt(match[1]);
      if (end >= 1 && end < totalPages) {
        points.add(end);
      }
    }
  }
  return points;
}

// ── Split PDF Preview Component ───────────────────────────────────────────────
function SplitPDFPreview({
  file,
  pageCount,
  splitMode,
  onSplitModeChange,
  splitRanges,
  onSplitRangesChange,
  previews,
  loading,
  selectedSplitPoints,
  onToggleSplitPoint,
}: {
  file: File;
  pageCount: number;
  splitMode: "all" | "ranges";
  onSplitModeChange: (m: "all" | "ranges") => void;
  splitRanges: string;
  onSplitRangesChange: (v: string) => void;
  previews: { page: number; dataUrl: string }[];
  loading: boolean;
  selectedSplitPoints: Set<number>;
  onToggleSplitPoint: (p: number) => void;
}) {
  // Parse ranges to show visual preview
  const parsedRanges: { label: string; pages: number[] }[] = [];
  if (splitMode === "ranges" && splitRanges.trim()) {
    splitRanges.split(",").forEach((part, i) => {
      const match = part.trim().match(/^(\d+)(?:-(\d+))?$/);
      if (match) {
        const start = parseInt(match[1]);
        const end = match[2] ? parseInt(match[2]) : start;
        const pages = Array.from({ length: end - start + 1 }, (_, j) => start + j);
        parsedRanges.push({ label: `Part ${i + 1}`, pages });
      }
    });
  }

  return (
    <div>
      {/* File info */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", background: "#F9FAFB",
        border: "1px solid #E5E7EB", borderRadius: 10, marginBottom: 16,
      }}>
        <span style={{ fontSize: "1.3rem" }}>📄</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "0.85rem", fontWeight: 500, color: "#111827" }}>{file.name}</p>
          <p style={{ fontSize: "0.72rem", color: "#6B7280" }}>{pageCount} pages total</p>
        </div>
      </div>

      {/* Page pills visual (only for 'all' split mode) */}
      {splitMode === "all" && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: "0.78rem", color: "#6B7280", marginBottom: 8 }}>Pages in this PDF:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => {
              return (
                <div key={p} style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "#4F46E5", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.72rem", fontWeight: 600,
                  transition: "all 0.2s",
                  border: "none",
                }}>
                  {p}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Split mode selector */}
      <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: 8 }}>
        How do you want to split?
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[
          { val: "all", label: "Every page", sub: `Makes ${pageCount} separate PDFs`, icon: "📑" },
          { val: "ranges", label: "Custom ranges", sub: "You define the splits", icon: "✂️" },
        ].map((opt) => (
          <button
            key={opt.val}
            onClick={() => onSplitModeChange(opt.val as "all" | "ranges")}
            style={{
              padding: "12px 10px", textAlign: "left",
              border: `1.5px solid ${splitMode === opt.val ? "#4F46E5" : "#E5E7EB"}`,
              borderRadius: 10, cursor: "pointer",
              background: splitMode === opt.val ? "#EEF2FF" : "#fff",
              transition: "all 0.15s",
            }}
          >
            <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>{opt.icon}</div>
            <p style={{ fontSize: "0.82rem", fontWeight: 600, color: splitMode === opt.val ? "#4F46E5" : "#111827" }}>
              {opt.label}
            </p>
            <p style={{ fontSize: "0.7rem", color: "#6B7280" }}>{opt.sub}</p>
          </button>
        ))}
      </div>

      {/* Large Page Review and Range Input */}
      {splitMode === "ranges" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Large page visual selector */}
          <div>
            <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>
              Select pages to split
            </p>
            <p style={{ fontSize: "0.75rem", color: "#6B7280", marginBottom: 12 }}>
              Click on page cards to toggle split points. A split boundary is added immediately <strong>after</strong> the selected page.
            </p>

            {loading ? (
              <div style={{ textAlign: "center", padding: "2rem 0" }}>
                <div style={{
                  width: 36, height: 36, border: "3px solid #EEF2FF",
                  borderTop: "3px solid #4F46E5", borderRadius: "50%",
                  margin: "0 auto 12px",
                  animation: "spin 0.8s linear infinite",
                }} />
                <p style={{ fontSize: "0.82rem", color: "#6B7280" }}>Generating page previews…</p>
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 16,
                maxHeight: 500,
                padding: "6px 4px",
                overflowY: "auto",
                border: "1px solid #E5E7EB",
                borderRadius: 12,
                background: "#F9FAFB",
              }}>
                {previews.map((p) => {
                  const isSplitPoint = selectedSplitPoints.has(p.page);
                  const sortedPoints = Array.from(selectedSplitPoints)
                    .filter((pt) => pt >= 1 && pt < pageCount)
                    .sort((a, b) => a - b);
                  const partIndex = sortedPoints.filter((pt) => pt < p.page).length;
                  const partNum = partIndex + 1;

                  const partColors = [
                    { border: "#4F46E5", bg: "#EEF2FF" },
                    { border: "#10B981", bg: "#ECFDF5" },
                    { border: "#8B5CF6", bg: "#F5F3FF" },
                    { border: "#F59E0B", bg: "#FFFBEB" },
                    { border: "#EF4444", bg: "#FEF2F2" },
                    { border: "#06B6D4", bg: "#ECFEFF" },
                    { border: "#EC4899", bg: "#FDF2F8" },
                    { border: "#6366F1", bg: "#EEF2FF" },
                  ];
                  const color = partColors[partIndex % partColors.length];

                  return (
                    <button
                      type="button"
                      key={p.page}
                      onClick={() => {
                        if (p.page < pageCount) {
                          onToggleSplitPoint(p.page);
                        }
                      }}
                      style={{
                        padding: 0,
                        cursor: p.page < pageCount ? "pointer" : "default",
                        border: `2px solid ${color.border}`,
                        borderRadius: 10,
                        overflow: "hidden",
                        position: "relative",
                        background: color.bg,
                        transition: "all 0.15s",
                        textAlign: "left",
                        boxShadow: isSplitPoint ? `0 0 0 3px ${color.border}30` : "none",
                      }}
                    >
                      {/* Part Badge */}
                      <div style={{
                        position: "absolute", top: 8, left: 8,
                        background: color.border, color: "#fff",
                        fontSize: "0.65rem", fontWeight: 700,
                        padding: "2px 6px", borderRadius: 4,
                        zIndex: 2,
                      }}>
                        Part {partNum}
                      </div>

                      {/* Split point indicator */}
                      {p.page < pageCount && (
                        <div style={{
                          position: "absolute", top: 8, right: 8,
                          width: 22, height: 22, borderRadius: "50%",
                          background: isSplitPoint ? "#F59E0B" : "rgba(255, 255, 255, 0.8)",
                          border: `1.5px solid ${isSplitPoint ? "#D97706" : "#D1D5DB"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.75rem", color: isSplitPoint ? "#fff" : "#4B5563",
                          transition: "all 0.15s",
                          zIndex: 2,
                        }}>
                          {isSplitPoint ? "✂️" : "+"}
                        </div>
                      )}

                      {/* Page Thumbnail */}
                      <div style={{ padding: "30px 10px 10px 10px", display: "flex", justifyContent: "center", background: "#fff" }}>
                        <img
                          src={p.dataUrl}
                          alt={`Page ${p.page}`}
                          style={{ width: "100%", height: "auto", maxHeight: "140px", objectFit: "contain", border: "1px solid #E5E7EB" }}
                        />
                      </div>

                      {/* Bottom Status Bar */}
                      <div style={{
                        padding: "6px 8px",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        color: isSplitPoint ? "#B45309" : "#4B5563",
                        background: isSplitPoint ? "#FEF3C7" : "rgba(0,0,0,0.03)",
                        borderTop: `1px solid ${isSplitPoint ? "#FCD34D" : "#E5E7EB"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}>
                        <span>Page {p.page}</span>
                        {isSplitPoint && <span>✂️ Split after</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Text Input Box */}
          <div>
            <p style={{ fontSize: "0.78rem", color: "#6B7280", marginBottom: 6 }}>
              Enter page ranges separated by commas (optional). Example: <strong>1-3, 4-6, 7</strong>
            </p>
            <input
              type="text"
              value={splitRanges}
              onChange={(e) => onSplitRangesChange(e.target.value)}
              placeholder="e.g. 1-3, 4-6, 7"
              style={{
                width: "100%", padding: "10px 14px",
                border: "1.5px solid #E5E7EB", borderRadius: 10,
                fontSize: "0.9rem", outline: "none", color: "#111827",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#4F46E5")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
            />
          </div>

          {/* Live range preview */}
          {parsedRanges.length > 0 && (
            <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 6 }}>
              {parsedRanges.map((r, i) => {
                const colors = ["#4F46E5", "#0891B2", "#059669", "#D97706", "#DC2626", "#7C3AED"];
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", borderRadius: 8,
                    background: `${colors[i % colors.length]}12`,
                    border: `1px solid ${colors[i % colors.length]}30`,
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: colors[i % colors.length], flexShrink: 0,
                    }} />
                    <p style={{ fontSize: "0.78rem", color: "#374151" }}>
                      <strong>{r.label}</strong> — pages {r.pages.join(", ")}
                      <span style={{ color: "#9CA3AF", marginLeft: 6 }}>
                        ({r.pages.length} page{r.pages.length !== 1 ? "s" : ""})
                      </span>
                    </p>
                  </div>
                );
              })}
              <p style={{ fontSize: "0.7rem", color: "#6B7280", marginTop: 2 }}>
                → Will create {parsedRanges.length} PDF file{parsedRanges.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export default function ToolView({ tool, onBack }: ToolViewProps) {
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<State>("idle");
  const [progress, setProgress] = useState(0);
  const [bgProgress, setBgProgress] = useState(0);
  const [bgStage, setBgStage] = useState("");
  const [error, setError] = useState("");
  const [resultInfo, setResultInfo] = useState("");

  const [compressLevel, setCompressLevel] = useState("medium");
  const [rotateAngle, setRotateAngle] = useState("90");
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [pageRange, setPageRange] = useState("");
  const [password, setPassword] = useState("");
  const [splitMode, setSplitMode] = useState<"all" | "ranges">("all");
  const [splitRanges, setSplitRanges] = useState("");
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null);
  const [splitPagePreviews, setSplitPagePreviews] = useState<{ page: number; dataUrl: string }[]>([]);
  const [splitPreviewLoading, setSplitPreviewLoading] = useState(false);
  const [selectedSplitPoints, setSelectedSplitPoints] = useState<Set<number>>(new Set());
  const [jpgPagePreviews, setJpgPagePreviews] = useState<{ page: number; dataUrl: string }[]>([]);
  const [jpgSelectedPages, setJpgSelectedPages] = useState<Set<number>>(new Set());
  const [jpgPreviewLoading, setJpgPreviewLoading] = useState(false);
  const [removePagePreviews, setRemovePagePreviews] = useState<{ page: number; dataUrl: string }[]>([]);
  const [selectedRemovePages, setSelectedRemovePages] = useState<Set<number>>(new Set());
  const [removePreviewLoading, setRemovePreviewLoading] = useState(false);
  const [extractPagePreviews, setExtractPagePreviews] = useState<{ page: number; dataUrl: string }[]>([]);
  const [selectedExtractPages, setSelectedExtractPages] = useState<Set<number>>(new Set());
  const [extractPreviewLoading, setExtractPreviewLoading] = useState(false);
  const [redactPages, setRedactPages] = useState<{ page: number; dataUrl: string; width: number; height: number }[]>([]);
  const [redactBoxes, setRedactBoxes] = useState<RedactionBox[]>([]);
  const [redactLoading, setRedactLoading] = useState(false);
  const [signPages, setSignPages] = useState<{ page: number; dataUrl: string }[]>([]);
  const [signatures, setSignatures] = useState<SignaturePlacement[]>([]);
const [signLoading, setSignLoading] = useState(false);
  const [editPages, setEditPages] = useState<{ page: number; dataUrl: string }[]>([]);
  const [editElements, setEditElements] = useState<PDFEditElement[]>([]);
  const [editLoading, setEditLoading] = useState(false);  const [rotatePagePreviews, setRotatePagePreviews] = useState<{ page: number; dataUrl: string }[]>([]);
  const [rotateSelectedPages, setRotateSelectedPages] = useState<Set<number>>(new Set());
  const [rotatePreviewLoading, setRotatePreviewLoading] = useState(false);

  const handleSplitRangesChange = (val: string) => {
    setSplitRanges(val);
    if (pdfPageCount) {
      const points = parseSplitPointsFromRanges(val, pdfPageCount);
      setSelectedSplitPoints(points);
    }
  };

  const handleFiles = useCallback(
    async (incoming: File[]) => {
      if (tool.multiple) {
        setFiles((prev) => [...prev, ...incoming]);
      } else {
        setFiles([incoming[0]]);
      }
      setState("idle");
      setError("");

      // For split tool — read page count and render previews
      if (tool.id === "split" && incoming[0]) {
        setSplitPreviewLoading(true);
        setSplitPagePreviews([]);
        setSelectedSplitPoints(new Set());
        try {
          const { PDFDocument } = await import("pdf-lib");
          const bytes = await incoming[0].arrayBuffer();
          const pdf = await PDFDocument.load(bytes);
          const total = pdf.getPageCount();
          setPdfPageCount(total);

          const pdfjsLib = await loadPdfJsForPreview();
          const pdfDoc = await pdfjsLib.getDocument({ data: bytes }).promise;
          const previews: { page: number; dataUrl: string }[] = [];
          for (let p = 1; p <= total; p++) {
            const page = await pdfDoc.getPage(p);
            const viewport = page.getViewport({ scale: 0.45 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Unable to create PDF page preview");
            await page.render({ canvasContext: ctx, viewport }).promise;
            previews.push({ page: p, dataUrl: canvas.toDataURL("image/jpeg", 0.7) });
          }
          setSplitPagePreviews(previews);
        } catch (e) {
          console.error("Failed to generate split page previews", e);
          setPdfPageCount(null);
        } finally {
          setSplitPreviewLoading(false);
        }
      }
// For rotate tool — render page thumbnails
      if (tool.id === "rotate" && incoming[0]) {
        setRotatePreviewLoading(true);
        setRotatePagePreviews([]);
        setRotateSelectedPages(new Set());
        try {
          const pdfjsLib = await loadPdfJsForPreview();
          const arrayBuffer = await incoming[0].arrayBuffer();
          const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const total = pdfDoc.numPages;
          const previews: { page: number; dataUrl: string }[] = [];
          for (let p = 1; p <= total; p++) {
            const page = await pdfDoc.getPage(p);
            const viewport = page.getViewport({ scale: 0.65 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d")!;
            await page.render({ canvasContext: ctx, viewport }).promise;
            previews.push({ page: p, dataUrl: canvas.toDataURL("image/jpeg", 0.7) });
          }
          setRotatePagePreviews(previews);
          // Select all pages by default
          setRotateSelectedPages(new Set(previews.map((p) => p.page)));
        } catch (e) {
          console.error("Rotate preview failed", e);
        } finally {
          setRotatePreviewLoading(false);
        }
      }
      // For edit-pdf tool — render full pages
      if (tool.id === "edit-pdf" && incoming[0]) {
        setEditLoading(true);
        setEditPages([]);
        setEditElements([]);
        try {
          const pages = await renderPdfPagesForRedaction(incoming[0]);
          setEditPages(pages.map((p) => ({ page: p.page, dataUrl: p.dataUrl })));
        } catch (e) {
          console.error("Failed to render pages for editing", e);
        } finally {
          setEditLoading(false);
        }
      }
      // For sign tool — render full pages for signature placement
      if (tool.id === "sign" && incoming[0]) {
        setSignLoading(true);
        setSignPages([]);
        setSignatures([]);
        try {
          const pages = await renderPdfPagesForRedaction(incoming[0]);
          setSignPages(pages.map((p) => ({ page: p.page, dataUrl: p.dataUrl })));
        } catch (e) {
          console.error("Failed to render pages for signing", e);
        } finally {
          setSignLoading(false);
        }
      }
      // For redact tool — render full pages for redaction editor
      if (tool.id === "redact" && incoming[0]) {
        setRedactLoading(true);
        setRedactPages([]);
        setRedactBoxes([]);
        try {
          const pages = await renderPdfPagesForRedaction(incoming[0]);
          setRedactPages(pages);
        } catch (e) {
          console.error("Failed to render pages for redaction", e);
        } finally {
          setRedactLoading(false);
          setSignPages([]);
          setSignatures([]);
          setSignLoading(false);
    setEditPages([]);
    setEditElements([]);
    setEditLoading(false);
        }
      }
      // For pdf-to-jpg — render page thumbnails via pdfjs CDN
      if (tool.id === "pdf-to-jpg" && incoming[0]) {
        setJpgPreviewLoading(true);
        setJpgPagePreviews([]);
        setJpgSelectedPages(new Set());
        try {
          const pdfjsLib = await loadPdfJsForPreview();
          const arrayBuffer = await incoming[0].arrayBuffer();
          const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const total = pdfDoc.numPages;
          const previews: { page: number; dataUrl: string }[] = [];
          for (let p = 1; p <= total; p++) {
            const page = await pdfDoc.getPage(p);
            const viewport = page.getViewport({ scale: 0.65 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d")!;
            await page.render({ canvasContext: ctx, viewport }).promise;
            previews.push({ page: p, dataUrl: canvas.toDataURL("image/jpeg", 0.7) });
          }
          setJpgPagePreviews(previews);
          // Select all pages by default
          setJpgSelectedPages(new Set(previews.map((p) => p.page)));
        } catch (e) {
          console.error("Preview generation failed", e);
        } finally {
          setJpgPreviewLoading(false);
        }
      }

      // For remove-pages — render clickable page thumbnails via pdfjs CDN
      // For extract-pages — render clickable page thumbnails
      if (tool.id === "extract-pages" && incoming[0]) {
        setExtractPreviewLoading(true);
        setExtractPagePreviews([]);
        setSelectedExtractPages(new Set());
        try {
          const pdfjsLib = await loadPdfJsForPreview();
          const arrayBuffer = await incoming[0].arrayBuffer();
          const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const total = pdfDoc.numPages;
          const previews: { page: number; dataUrl: string }[] = [];
          for (let p = 1; p <= total; p++) {
            const page = await pdfDoc.getPage(p);
            const viewport = page.getViewport({ scale: 0.65 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d")!;
            await page.render({ canvasContext: ctx, viewport }).promise;
            previews.push({ page: p, dataUrl: canvas.toDataURL("image/jpeg", 0.7) });
          }
          setExtractPagePreviews(previews);
        } catch (e) {
          console.error("Extract pages preview generation failed", e);
        } finally {
          setExtractPreviewLoading(false);
        }
      }
      if (tool.id === "remove-pages" && incoming[0]) {
        setRemovePreviewLoading(true);
        setRemovePagePreviews([]);
        setSelectedRemovePages(new Set());
        try {
          const pdfjsLib = await loadPdfJsForPreview();
          const arrayBuffer = await incoming[0].arrayBuffer();
          const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const total = pdfDoc.numPages;
          const previews: { page: number; dataUrl: string }[] = [];
          for (let p = 1; p <= total; p++) {
            const page = await pdfDoc.getPage(p);
            const viewport = page.getViewport({ scale: 0.4 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Unable to create PDF page preview");
            await page.render({ canvasContext: ctx, viewport }).promise;
            previews.push({ page: p, dataUrl: canvas.toDataURL("image/jpeg", 0.7) });
          }
          setRemovePagePreviews(previews);
        } catch (e) {
          console.error("Remove pages preview generation failed", e);
          setError(e instanceof Error ? e.message : "Failed to generate PDF previews");
        } finally {
          setRemovePreviewLoading(false);
        }
      }
    },
    [tool.multiple, tool.id]
  );

  const removeFile = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  };

  const reorderFiles = (from: number, to: number) => {
    setFiles((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      return updated;
    });
  };

  const fakeProgress = () => {
    setProgress(0);
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 22;
      if (p >= 90) {
        clearInterval(iv);
        setProgress(90);
      } else {
        setProgress(Math.round(p));
      }
    }, 120);
    return iv;
  };

  const parsePages = (input: string): number[] => {
    return input
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);
  };

  const handleProcess = async () => {
    if (!files.length) return;
    setState("processing");
    setError("");
    const iv = fakeProgress();

    try {
      let result: Uint8Array | null = null;
      let splitResult: { name: string; bytes: Uint8Array }[] | null = null;

      switch (tool.id) {
        case "merge":
          result = await mergePDFs(files);
          setResultInfo(`Merged ${files.length} files`);
          break;
        case "split": {
          if (splitMode === "ranges" && splitRanges.trim()) {
            // Parse ranges like "1-3, 4-6, 7"
            const rangeParts = splitRanges.split(",").map((s) => s.trim()).filter(Boolean);
            const allResults: { name: string; bytes: Uint8Array }[] = [];
            for (let ri = 0; ri < rangeParts.length; ri++) {
              const part = rangeParts[ri];
              const match = part.match(/^(\d+)(?:-(\d+))?$/);
              if (!match) throw new Error(`Invalid range: "${part}". Use format like 1-3, 4, 5-7`);
              const start = parseInt(match[1]);
              const end = match[2] ? parseInt(match[2]) : start;
              const pageNums = Array.from({ length: end - start + 1 }, (_, i) => start + i);
              const bytes = await extractPages(files[0], pageNums);
              allResults.push({ name: `split_part_${ri + 1}.pdf`, bytes });
            }
            clearInterval(iv);
            setProgress(100);
            downloadZip(allResults, "split-parts");
            setResultInfo(`Split into ${allResults.length} part(s)`);
            setState("done");
            return;
          } else {
            splitResult = await splitPDF(files[0]);
            setResultInfo(`Split into ${splitResult.length} pages`);
          }
          break;
        }
        case "compress":
          result = await compressPDF(files[0]);
          setResultInfo("PDF compressed successfully");
          break;
       case "rotate": {
          const angle = parseInt(rotateAngle) as 90 | 180 | 270;
          if (rotateSelectedPages.size === rotatePagePreviews.length || rotatePagePreviews.length === 0) {
            // All pages — use existing function
            result = await rotatePDF(files[0], angle);
          } else {
            // Selected pages only — extract, rotate, merge back
            const { PDFDocument, degrees } = await import("pdf-lib");
            const bytes = await files[0].arrayBuffer();
            const pdf = await PDFDocument.load(bytes);
            pdf.getPages().forEach((page, i) => {
              if (rotateSelectedPages.has(i + 1)) {
                page.setRotation(degrees(angle));
              }
            });
            result = await pdf.save();
          }
          const pageLabel = rotateSelectedPages.size === rotatePagePreviews.length
            ? "all pages"
            : `${rotateSelectedPages.size} page(s)`;
          setResultInfo(`Rotated ${pageLabel} ${rotateAngle}°`);
          break;
        }
        case "watermark":
          result = await addWatermark(files[0], watermarkText || "WATERMARK");
          setResultInfo("Watermark added");
          break;
        case "page-numbers":
          result = await addPageNumbers(files[0]);
          setResultInfo("Page numbers added");
          break;
        case "extract-pages": {
          const pages = Array.from(selectedExtractPages).sort((a, b) => a - b);
          if (pages.length === 0) throw new Error("Select at least one page to extract");
          result = await extractPages(files[0], pages);
          setResultInfo(`Extracted ${pages.length} page(s)`);
          break;
        }
        case "remove-bg": {
          clearInterval(iv);
          setProgress(100);
          setBgProgress(0);
          setBgStage("Loading AI model…");

          const resultBlob = await removeImageBackground(files[0], (p) => {
            setBgProgress(p);
            if (p < 30) setBgStage("Downloading AI model…");
            else if (p < 60) setBgStage("Analyzing image…");
            else if (p < 90) setBgStage("Removing background…");
            else setBgStage("Finishing up…");
          });

          const baseName = files[0].name.replace(/\.[^.]+$/, "");
          const url = URL.createObjectURL(resultBlob);
          setResultUrl(url);
          downloadBlob(resultBlob, `${baseName}-no-bg.png`);
          setResultInfo("Background removed successfully");
          setState("done");
          return;
        }
        case "remove-pages": {
          const pages = Array.from(selectedRemovePages).sort((a, b) => a - b);
          if (pages.length === 0) throw new Error("Select at least one page to remove");
          if (pages.length >= removePagePreviews.length) {
            throw new Error("You cannot remove every page from the PDF");
          }
          result = await removePages(files[0], pages);
          setResultInfo(`Removed ${pages.length} page${pages.length !== 1 ? "s" : ""}`);
          break;
        }
        case "jpg-to-pdf":
          result = await imagesToPDF(files);
          setResultInfo(`${files.length} image(s) converted`);
          break;
        case "pdf-to-word": {
          const docxBlob = await pdfToWord(files[0], (page, total) => {
            setProgress(Math.round((page / total) * 90));
          });
          clearInterval(iv);
          setProgress(100);
          const baseName = files[0].name.replace(/\.pdf$/i, "");
          downloadBlob(docxBlob, `${baseName}.docx`);
          setResultInfo("PDF converted to Word document");
          setState("done");
          return;
        }

        case "pdf-to-jpg": {
          if (jpgSelectedPages.size === 0) throw new Error("Select at least one page to export");
          const allJpgFiles = await pdfToJpg(files[0], (page, total) => {
            setProgress(Math.round((page / total) * 90));
          });
          const filtered = allJpgFiles.filter((f) => jpgSelectedPages.has(f.page ?? allJpgFiles.indexOf(f) + 1));
          clearInterval(iv);
          setProgress(100);
          // Use all if filter fails (fallback)
          const toDownload = filtered.length > 0 ? filtered : allJpgFiles;
          toDownload.forEach(({ name, blob }) => downloadBlob(blob, name));
          setResultInfo(`Exported ${toDownload.length} page(s) as JPG`);
          setState("done");
          return;
        }

       
        case "sign": {
          if (signatures.length === 0) {
            throw new Error("Place at least one signature on the document first");
          }
          const result = await signPDF(files[0], signatures);
          clearInterval(iv);
          setProgress(100);
          downloadBytes(result, "signed.pdf");
          setResultInfo(`Added ${signatures.length} signature(s)`);
          setState("done");
          return;
        }
        case "redact": {
          if (redactBoxes.length === 0) {
            throw new Error("Draw at least one redaction box on the document first");
          }
          const result = await redactPDF(files[0], redactBoxes);
          clearInterval(iv);
          setProgress(100);
          downloadBytes(result, "redacted.pdf");
          setResultInfo(`Applied ${redactBoxes.length} redaction(s)`);
          setState("done");
          return;
        }
case "edit-pdf": {
          if (editElements.length === 0) {
            throw new Error("Add at least one element to the PDF first");
          }
          const result = await applyPDFEdits(files[0], editElements);
          clearInterval(iv);
          setProgress(100);
          const baseName = files[0].name.replace(/\.pdf$/i, "");
          downloadBytes(result, `${baseName}-edited.pdf`);
          setResultInfo(`Saved PDF with ${editElements.length} element(s)`);
          setState("done");
          return;
        }
        case "word-to-pdf": {
          clearInterval(iv);
          setProgress(100);
          await wordToPdf(files[0]);
          setResultInfo("Word document converted — save as PDF from the print dialog");
          setState("done");
          return;
        }
case "protect": {
          if (!password.trim()) {
            throw new Error("Enter a password to protect the PDF");
          }
          const protectedBlob = await protectPDF(files[0], password.trim());
          clearInterval(iv);
          setProgress(100);
          const baseName = files[0].name.replace(/\.pdf$/i, "");
          downloadBlob(protectedBlob, `${baseName}-protected.pdf`);
          setResultInfo("PDF protected with password successfully");
          setState("done");
          return;
        }
        default:
          clearInterval(iv);
          setProgress(100);
          setResultInfo("This tool is coming soon");
          setState("done");
          return;
      }

      clearInterval(iv);
      setProgress(100);

      if (splitResult) {
        downloadZip(splitResult, "split-pages");
      } else if (result) {
        downloadBytes(result, `${tool.id}-output.pdf`);
      }

      setState("done");
    } catch (err: unknown) {
      clearInterval(iv);
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const reset = () => {
    setFiles([]);
    setState("idle");
    setProgress(0);
    setError("");
    setPageRange("");
    setResultUrl(null);
    setSplitMode("all");
    setSplitRanges("");
    setPdfPageCount(null);
    setSplitPagePreviews([]);
    setSplitPreviewLoading(false);
    setSelectedSplitPoints(new Set());
    setJpgPagePreviews([]);
    setJpgSelectedPages(new Set());
    setJpgPreviewLoading(false);
    setRemovePagePreviews([]);
    setSelectedRemovePages(new Set());
    setRemovePreviewLoading(false);
    setExtractPagePreviews([]);
    setSelectedExtractPages(new Set());
    setExtractPreviewLoading(false);
    setRotatePagePreviews([]);
    setRotateSelectedPages(new Set());
    setRotatePreviewLoading(false);
  };

  const showOptions = ["compress", "rotate", "watermark", "protect", "unlock"].includes(tool.id);
  return (
    <div>
      {/* Back button */}
      <button onClick={onBack} className="btn-ghost" style={{ marginBottom: "1.5rem" }}>
        <ArrowLeft size={15} />
        Back to all tools
      </button>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: "1.75rem",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            background: tool.bg,
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.5rem",
            flexShrink: 0,
          }}
        >
          {tool.icon}
        </div>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#111827" }}>
            {tool.name}
          </h1>
          <p style={{ fontSize: "0.85rem", color: "#6B7280" }}>
            {tool.description}
          </p>
        </div>
      </div>

      {/* Main card */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #E5E7EB",
          borderRadius: 16,
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        {/* Dropzone */}
        <Dropzone
          accept={tool.accept}
          multiple={tool.multiple}
          onFiles={handleFiles}
          files={files}
          onRemove={removeFile}
        />

        {/* Options */}
        {/* Merge preview */}
        {tool.id === "merge" && files.length > 0 && state === "idle" && (
          <MergePDFPreview
            files={files}
            onReorder={reorderFiles}
            onRemove={removeFile}
          />
        )}
{/* PDF Editor */}
        {tool.id === "edit-pdf" && files.length > 0 && state === "idle" && (
          editLoading ? (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{
                width: 36, height: 36, border: "3px solid #ECFEFF",
                borderTop: "3px solid #0891B2", borderRadius: "50%",
                margin: "0 auto 12px",
                animation: "spin 0.8s linear infinite",
              }} />
              <p style={{ fontSize: "0.82rem", color: "#6B7280" }}>Loading PDF for editing…</p>
            </div>
          ) : (
            <PDFEditor
              pages={editPages}
              elements={editElements}
              onAdd={(el) => setEditElements((prev) => [...prev, el])}
              onUpdate={(id, changes) =>
                setEditElements((prev) =>
                  prev.map((el) => el.id === id ? { ...el, ...changes } : el)
                )
              }
              onRemove={(id) => setEditElements((prev) => prev.filter((el) => el.id !== id))}
            />
          )
        )}
        {/* Sign editor */}
        {tool.id === "sign" && files.length > 0 && state === "idle" && (
          signLoading ? (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{
                width: 36, height: 36, border: "3px solid #EEF2FF",
                borderTop: "3px solid #4F46E5", borderRadius: "50%",
                margin: "0 auto 12px",
                animation: "spin 0.8s linear infinite",
              }} />
              <p style={{ fontSize: "0.82rem", color: "#6B7280" }}>Loading document…</p>
            </div>
          ) : (
            <SignEditor
              pages={signPages}
              signatures={signatures}
              onAddSignature={(sig) => setSignatures((prev) => [...prev, sig])}
              onRemoveSignature={(index) => setSignatures((prev) => prev.filter((_, i) => i !== index))}
              onMoveSignature={(index, x, y) =>
                setSignatures((prev) =>
                  prev.map((s, i) => (i === index ? { ...s, x, y } : s))
                )
              }
            />
          )
        )}
        {/* Redact editor */}
        {tool.id === "redact" && files.length > 0 && state === "idle" && (
          redactLoading ? (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{
                width: 36, height: 36, border: "3px solid #FEF2F2",
                borderTop: "3px solid #DC2626", borderRadius: "50%",
                margin: "0 auto 12px",
                animation: "spin 0.8s linear infinite",
              }} />
              <p style={{ fontSize: "0.82rem", color: "#6B7280" }}>Loading document for editing…</p>
            </div>
          ) : (
            <RedactEditor
              pages={redactPages}
              redactions={redactBoxes}
              onAddRedaction={(box) => setRedactBoxes((prev) => [...prev, box])}
              onRemoveRedaction={(index) => setRedactBoxes((prev) => prev.filter((_, i) => i !== index))}
            />
          )
        )}
        {/* Remove pages selector */}
        {/* Extract pages selector */}
        {tool.id === "extract-pages" && files.length > 0 && state === "idle" && (
          <PdfPageSelector
            previews={extractPagePreviews}
            selectedPages={selectedExtractPages}
            loading={extractPreviewLoading}
            mode="export"
            onToggle={(p) => {
              setSelectedExtractPages((prev) => {
                const next = new Set(prev);
                next.has(p) ? next.delete(p) : next.add(p);
                return next;
              });
            }}
            onSelectAll={() => setSelectedExtractPages(new Set(extractPagePreviews.map((p) => p.page)))}
            onDeselectAll={() => setSelectedExtractPages(new Set())}
          />
        )}
        {tool.id === "remove-pages" && files.length > 0 && state === "idle" && (
          <PdfPageSelector
            previews={removePagePreviews}
            selectedPages={selectedRemovePages}
            loading={removePreviewLoading}
            mode="remove"
            onToggle={(p) => {
              setSelectedRemovePages((prev) => {
                const next = new Set(prev);
                next.has(p) ? next.delete(p) : next.add(p);
                return next;
              });
            }}
            onSelectAll={() => setSelectedRemovePages(new Set(removePagePreviews.map((p) => p.page)))}
            onDeselectAll={() => setSelectedRemovePages(new Set())}
          />
        )}
        {/* PDF to JPG page selector */}
        {tool.id === "pdf-to-jpg" && files.length > 0 && state === "idle" && (
          <PdfPageSelector
            previews={jpgPagePreviews}
            selectedPages={jpgSelectedPages}
            loading={jpgPreviewLoading}
            mode="export"
            onToggle={(p) => {
              setJpgSelectedPages((prev) => {
                const next = new Set(prev);
                next.has(p) ? next.delete(p) : next.add(p);
                return next;
              });
            }}
            onSelectAll={() => setJpgSelectedPages(new Set(jpgPagePreviews.map((p) => p.page)))}
            onDeselectAll={() => setJpgSelectedPages(new Set())}
          />
        )}
        {/* Split preview */}
        {tool.id === "split" && files.length > 0 && state === "idle" && pdfPageCount && (
          <SplitPDFPreview
            file={files[0]}
            pageCount={pdfPageCount}
            splitMode={splitMode}
            onSplitModeChange={setSplitMode}
            splitRanges={splitRanges}
            onSplitRangesChange={handleSplitRangesChange}
            previews={splitPagePreviews}
            loading={splitPreviewLoading}
            selectedSplitPoints={selectedSplitPoints}
            onToggleSplitPoint={(p) => {
              setSelectedSplitPoints((prev) => {
                const next = new Set(prev);
                if (next.has(p)) {
                  next.delete(p);
                } else {
                  next.add(p);
                }
                const newRanges = updateSplitRanges(next, pdfPageCount);
                setSplitRanges(newRanges);
                return next;
              });
            }}
          />
        )}
        {/* Rotate page selector */}
        {tool.id === "rotate" && files.length > 0 && state === "idle" && (
          <div>
            {rotatePreviewLoading ? (
              <div style={{ textAlign: "center", padding: "2rem 0" }}>
                <div style={{
                  width: 36, height: 36, border: "3px solid #EEF2FF",
                  borderTop: "3px solid #4F46E5", borderRadius: "50%",
                  margin: "0 auto 12px",
                  animation: "spin 0.8s linear infinite",
                }} />
                <p style={{ fontSize: "0.82rem", color: "#6B7280" }}>Generating page previews…</p>
              </div>
            ) : rotatePagePreviews.length > 0 && (
              <div>
                {/* Angle selector */}
                <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#111827", marginBottom: 10 }}>
                  Rotation angle
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 18 }}>
                  {[
                    { val: "90", label: "90° clockwise", icon: "↻" },
                    { val: "180", label: "180°", icon: "↔" },
                    { val: "270", label: "90° counter", icon: "↺" },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => setRotateAngle(opt.val)}
                      style={{
                        padding: "12px 8px", textAlign: "center",
                        border: `1.5px solid ${rotateAngle === opt.val ? "#4F46E5" : "#E5E7EB"}`,
                        borderRadius: 10, cursor: "pointer",
                        background: rotateAngle === opt.val ? "#EEF2FF" : "#fff",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{opt.icon}</div>
                      <p style={{
                        fontSize: "0.72rem", fontWeight: 600,
                        color: rotateAngle === opt.val ? "#4F46E5" : "#374151",
                      }}>
                        {opt.label}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Page selector */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#111827" }}>
                      Select pages to rotate
                    </p>
                    <p style={{ fontSize: "0.72rem", color: "#6B7280" }}>
                      {rotateSelectedPages.size} of {rotatePagePreviews.length} page{rotatePagePreviews.length !== 1 ? "s" : ""} selected
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => setRotateSelectedPages(new Set(rotatePagePreviews.map((p) => p.page)))}
                      style={{
                        fontSize: "0.72rem", padding: "4px 10px",
                        border: "1px solid #E5E7EB", borderRadius: 6,
                        background: "#fff", cursor: "pointer", color: "#374151",
                      }}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setRotateSelectedPages(new Set())}
                      style={{
                        fontSize: "0.72rem", padding: "4px 10px",
                        border: "1px solid #E5E7EB", borderRadius: 6,
                        background: "#fff", cursor: "pointer", color: "#374151",
                      }}
                    >
                      None
                    </button>
                  </div>
                </div>

                {/* Page grid with rotation preview */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                  gap: 12,
                  maxHeight: 500,
                  overflowY: "auto",
                  padding: "4px 2px",
                }}>
                  {rotatePagePreviews.map(({ page, dataUrl }) => {
                    const selected = rotateSelectedPages.has(page);
                    const angleNum = parseInt(rotateAngle);
                    return (
                      <button
                        key={page}
                        onClick={() => {
                          setRotateSelectedPages((prev) => {
                            const next = new Set(prev);
                            next.has(page) ? next.delete(page) : next.add(page);
                            return next;
                          });
                        }}
                        style={{
                          padding: 0, cursor: "pointer",
                          border: `2px solid ${selected ? "#4F46E5" : "#E5E7EB"}`,
                          borderRadius: 10, overflow: "hidden",
                          background: selected ? "#EEF2FF" : "#F9FAFB",
                          transition: "all 0.15s",
                          boxShadow: selected ? "0 0 0 3px #C7D2FE" : "none",
                        }}
                      >
                        {/* Thumbnail with rotation preview */}
                        <div style={{
                          padding: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#fff",
                          minHeight: 100,
                        }}>
                          <img
                            src={dataUrl}
                            alt={`Page ${page}`}
                            style={{
                              maxWidth: "100%",
                              maxHeight: 120,
                              display: "block",
                              transform: selected ? `rotate(${angleNum}deg)` : "rotate(0deg)",
                              transition: "transform 0.4s ease",
                              transformOrigin: "center center",
                            }}
                          />
                        </div>

                        {/* Checkbox + label */}
                        <div style={{
                          padding: "6px 8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          background: selected ? "#EEF2FF" : "#F9FAFB",
                          borderTop: `1px solid ${selected ? "#C7D2FE" : "#E5E7EB"}`,
                        }}>
                          <span style={{
                            fontSize: "0.7rem", fontWeight: selected ? 600 : 400,
                            color: selected ? "#4F46E5" : "#6B7280",
                          }}>
                            Page {page}
                          </span>
                          <div style={{
                            width: 18, height: 18, borderRadius: "50%",
                            background: selected ? "#4F46E5" : "transparent",
                            border: `2px solid ${selected ? "#4F46E5" : "#D1D5DB"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.6rem", color: "#fff",
                          }}>
                            {selected && "✓"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {rotateSelectedPages.size === 0 && (
                  <p style={{ marginTop: 8, fontSize: "0.75rem", color: "#DC2626", textAlign: "center" }}>
                    Select at least one page to rotate
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        {files.length > 0 && showOptions && state === "idle" && (
  <>
    {tool.id === "compress" && (
      <CompressOptions
        value={compressLevel}
        onChange={setCompressLevel}
      />
    )}

    {/* Rotation options removed because the custom
        Rotation Angle section is displayed above */}

    {tool.id === "watermark" && (
      <WatermarkOptions
        value={watermarkText}
        onChange={setWatermarkText}
      />
    )}

    {(tool.id === "protect" || tool.id === "unlock") && (
      <PasswordOptions
        value={password}
        onChange={setPassword}
        label={
          tool.id === "protect"
            ? "Set password"
            : "Enter current password"
        }
      />
    )}
  </>
)}

        {/* Processing */}
        {state === "processing" && (
          <div>
            {tool.id === "remove-bg" ? (
              /* ── Background removal animation ── */
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                {/* Animated eraser graphic */}
                <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 1.25rem" }}>
                  {/* Outer pulse ring */}
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: "50%",
                    background: "rgba(124,58,237,0.12)",
                    animation: "bgPulse 1.8s ease-in-out infinite",
                  }} />
                  {/* Middle ring */}
                  <div style={{
                    position: "absolute", inset: 12, borderRadius: "50%",
                    background: "rgba(124,58,237,0.18)",
                    animation: "bgPulse 1.8s ease-in-out infinite 0.3s",
                  }} />
                  {/* Inner circle */}
                  <div style={{
                    position: "absolute", inset: 24, borderRadius: "50%",
                    background: "linear-gradient(135deg, #7C3AED, #4F46E5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "2rem",
                    boxShadow: "0 8px 24px rgba(124,58,237,0.35)",
                  }}>
                    🪄
                  </div>
                  {/* Orbiting dot */}
                  <div style={{
                    position: "absolute", inset: 0,
                    animation: "bgOrbit 2s linear infinite",
                  }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: "50%",
                      background: "#7C3AED",
                      position: "absolute", top: 4, left: "50%",
                      transform: "translateX(-50%)",
                      boxShadow: "0 0 8px rgba(124,58,237,0.8)",
                    }} />
                  </div>
                </div>

                {/* Stage label */}
                <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#7C3AED", marginBottom: 6 }}>
                  {bgStage}
                </p>
                <p style={{ fontSize: "0.75rem", color: "#9CA3AF", marginBottom: 14 }}>
                  First run downloads the AI model (~5MB)
                </p>

                {/* Progress bar */}
                <div style={{ maxWidth: 280, margin: "0 auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: "0.72rem", color: "#6B7280" }}>Progress</span>
                    <span style={{ fontSize: "0.72rem", color: "#7C3AED", fontWeight: 600 }}>{bgProgress}%</span>
                  </div>
                  <div style={{ height: 8, background: "#EDE9FE", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 99,
                      background: "linear-gradient(90deg, #7C3AED, #06B6D4)",
                      width: `${bgProgress}%`,
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                </div>

                {/* Checkerboard preview hint */}
                <div style={{
                  marginTop: 16,
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "#F5F3FF", borderRadius: 99, padding: "6px 14px",
                }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: 3,
                    background: "repeating-conic-gradient(#C4B5FD 0% 25%, #fff 0% 50%) 0 0 / 6px 6px",
                  }} />
                  <span style={{ fontSize: "0.72rem", color: "#7C3AED" }}>Transparent PNG output</span>
                </div>
              </div>
            ) : (
              /* ── Default progress bar for other tools ── */
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <p style={{ fontSize: "0.8rem", color: "#6B7280" }}>Processing…</p>
                  <p style={{ fontSize: "0.8rem", color: "#4F46E5", fontWeight: 500 }}>{progress}%</p>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {state === "error" && (
          <div
            style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 10,
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <AlertCircle size={18} color="#DC2626" />
            <p style={{ fontSize: "0.85rem", color: "#DC2626" }}>{error}</p>
          </div>
        )}

        {/* Success */}
        {state === "done" && (
          <div className="success-box">
            <CheckCircle
              size={40}
              color="#16A34A"
              style={{ margin: "0 auto 10px", display: "block" }}
            />
            <p style={{ fontWeight: 600, fontSize: "1rem", color: "#111827", marginBottom: 4 }}>
              Done!
            </p>
            <p style={{ fontSize: "0.82rem", color: "#6B7280", marginBottom: 16 }}>
              {resultInfo} — your file has been downloaded
            </p>
            {resultUrl && (
              <div style={{ marginBottom: 16 }}>
                <img
                  src={resultUrl}
                  alt="Result preview"
                  style={{
                    maxWidth: "100%",
                    maxHeight: 300,
                    borderRadius: 10,
                    border: "1px solid #E5E7EB",
                    background:
                      "repeating-conic-gradient(#E5E7EB 0% 25%, #fff 0% 50%) 0 0 / 16px 16px",
                  }}
                />
              </div>
            )}
            <button onClick={reset} className="btn-ghost">
              Process another file
            </button>
          </div>
        )}

        {/* Action buttons */}
        {files.length > 0 && state === "idle" && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={handleProcess} className="btn-primary">
              <Download size={15} />
              {tool.actionLabel}
            </button>
            <button onClick={reset} className="btn-ghost">
              Clear
            </button>
          </div>
        )}

        {state === "error" && (
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleProcess} className="btn-primary">
              Try again
            </button>
            <button onClick={reset} className="btn-ghost">
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Info tip */}
      <div
        style={{
          marginTop: "1rem",
          padding: "10px 14px",
          background: "#F8F9FB",
          borderRadius: 10,
          fontSize: "0.75rem",
          color: "#6B7280",
        }}
      >
        🔒 Files are processed locally in your browser. Nothing is uploaded to any server.
      </div>
    </div>
  );
}