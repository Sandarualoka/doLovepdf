"use client";
import { useState, useRef, useCallback } from "react";
import type { RedactionBox } from "@/lib/pdf-utils";

interface RedactEditorProps {
  pages: { page: number; dataUrl: string; width: number; height: number }[];
  redactions: RedactionBox[];
  onAddRedaction: (box: RedactionBox) => void;
  onRemoveRedaction: (index: number) => void;
}

export default function RedactEditor({
  pages,
  redactions,
  onAddRedaction,
  onRemoveRedaction,
}: RedactEditorProps) {
  const [drawing, setDrawing] = useState<{
    page: number;
    startX: number;
    startY: number;
    curX: number;
    curY: number;
  } | null>(null);

  const containerRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const getRelativePos = (e: React.MouseEvent, page: number) => {
    const el = containerRefs.current[page];
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  const handleMouseDown = (e: React.MouseEvent, page: number) => {
    const { x, y } = getRelativePos(e, page);
    setDrawing({ page, startX: x, startY: y, curX: x, curY: y });
  };

  const handleMouseMove = (e: React.MouseEvent, page: number) => {
    if (!drawing || drawing.page !== page) return;
    const { x, y } = getRelativePos(e, page);
    setDrawing({ ...drawing, curX: x, curY: y });
  };

  const handleMouseUp = () => {
    if (!drawing) return;
    const x = Math.min(drawing.startX, drawing.curX);
    const y = Math.min(drawing.startY, drawing.curY);
    const width = Math.abs(drawing.curX - drawing.startX);
    const height = Math.abs(drawing.curY - drawing.startY);

    // Only add if the box has meaningful size
    if (width > 0.5 && height > 0.5) {
      onAddRedaction({ page: drawing.page, x, y, width, height });
    }
    setDrawing(null);
  };

  return (
    <div>
      <div
        style={{
          background: "#EEF2FF",
          border: "1px solid #C7D2FE",
          borderRadius: 10,
          padding: "10px 14px",
          marginBottom: 14,
          fontSize: "0.78rem",
          color: "#4F46E5",
        }}
      >
        ✏️ Click and drag over any text or area on the document below to redact it.
        Black boxes will permanently hide that content.
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          maxHeight: 600,
          overflowY: "auto",
          padding: "4px",
          background: "#F3F4F6",
          borderRadius: 12,
        }}
        onMouseUp={handleMouseUp}
      >
        {pages.map(({ page, dataUrl }) => {
          const pageRedactions = redactions
            .map((r, i) => ({ ...r, index: i }))
            .filter((r) => r.page === page);

          return (
            <div
              key={page}
              style={{
                position: "relative",
                margin: "0 auto",
                userSelect: "none",
              }}
            >
              <p style={{ fontSize: "0.72rem", color: "#6B7280", marginBottom: 6, textAlign: "center" }}>
                Page {page}
              </p>
              <div
                ref={(el) => { containerRefs.current[page] = el; }}
                onMouseDown={(e) => handleMouseDown(e, page)}
                onMouseMove={(e) => handleMouseMove(e, page)}
                style={{
                  position: "relative",
                  cursor: "crosshair",
                  display: "inline-block",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <img
                  src={dataUrl}
                  alt={`Page ${page}`}
                  style={{ display: "block", maxWidth: "100%", width: 700 }}
                  draggable={false}
                />

                {/* Existing redaction boxes */}
                {pageRedactions.map((r) => (
                  <div
                    key={r.index}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveRedaction(r.index);
                    }}
                    title="Click to remove"
                    style={{
                      position: "absolute",
                      left: `${r.x}%`,
                      top: `${r.y}%`,
                      width: `${r.width}%`,
                      height: `${r.height}%`,
                      background: "#000",
                      cursor: "pointer",
                      transition: "opacity 0.15s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.opacity = "0.7")}
                    onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
                  />
                ))}

                {/* Active drawing box */}
                {drawing && drawing.page === page && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${Math.min(drawing.startX, drawing.curX)}%`,
                      top: `${Math.min(drawing.startY, drawing.curY)}%`,
                      width: `${Math.abs(drawing.curX - drawing.startX)}%`,
                      height: `${Math.abs(drawing.curY - drawing.startY)}%`,
                      background: "rgba(0,0,0,0.5)",
                      border: "1.5px dashed #fff",
                      pointerEvents: "none",
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {redactions.length > 0 && (
        <p style={{ marginTop: 10, fontSize: "0.78rem", color: "#6B7280", textAlign: "center" }}>
          {redactions.length} redaction{redactions.length !== 1 ? "s" : ""} added — click any black box to remove it
        </p>
      )}
    </div>
  );
}