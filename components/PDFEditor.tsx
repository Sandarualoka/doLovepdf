"use client";
import { useState, useRef, useCallback } from "react";
import type { PDFEditElement, EditElementType } from "@/lib/pdf-utils";

const COLORS = [
  "#000000", "#DC2626", "#D97706", "#16A34A",
  "#2563EB", "#7C3AED", "#DB2777", "#ffffff",
];

interface PDFEditorProps {
  pages: { page: number; dataUrl: string }[];
  elements: PDFEditElement[];
  onAdd: (el: PDFEditElement) => void;
  onUpdate: (id: string, changes: Partial<PDFEditElement>) => void;
  onRemove: (id: string) => void;
}

export default function PDFEditor({
  pages, elements, onAdd, onUpdate, onRemove,
}: PDFEditorProps) {
  const [tool, setTool] = useState<EditElementType | "select">("select");
  const [drawing, setDrawing] = useState<{
    page: number; startX: number; startY: number; curX: number; curY: number;
  } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; offX: number; offY: number } | null>(null);

  // Text tool state
  const [textInput, setTextInput] = useState("");
  const [fontSize, setFontSize] = useState(16);
  const [fontColor, setFontColor] = useState("#000000");
  const [bold, setBold] = useState(false);

  // Shape style state
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [fillColor, setFillColor] = useState("transparent");
  const [strokeWidth, setStrokeWidth] = useState(2);

  const containerRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [pendingImagePage, setPendingImagePage] = useState<number | null>(null);

  const getPos = (e: React.MouseEvent, page: number) => {
    const el = containerRefs.current[page];
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  };

  const handleMouseDown = (e: React.MouseEvent, page: number) => {
    if (tool === "select") return;
    if (tool === "image") {
      setPendingImagePage(page);
      imageInputRef.current?.click();
      return;
    }
   if (tool === "text") {
      // Text is added via the "Add text" button in the sidebar, not by clicking
      return;
    }
    const { x, y } = getPos(e, page);
    setDrawing({ page, startX: x, startY: y, curX: x, curY: y });
  };

  const handleMouseMove = (e: React.MouseEvent, page: number) => {
    if (drawing && drawing.page === page) {
      const { x, y } = getPos(e, page);
      setDrawing((d) => d ? { ...d, curX: x, curY: y } : null);
    }
    if (dragging) {
      const el = elements.find((el) => el.id === dragging.id);
      if (!el) return;
      const container = containerRefs.current[el.page];
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = Math.max(0, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100 - dragging.offX));
      const y = Math.max(0, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100 - dragging.offY));
      onUpdate(dragging.id, { x, y });
    }
  };

  const handleMouseUp = (page: number) => {
    if (drawing && drawing.page === page) {
      const x = Math.min(drawing.startX, drawing.curX);
      const y = Math.min(drawing.startY, drawing.curY);
      const width = Math.abs(drawing.curX - drawing.startX);
      const height = Math.abs(drawing.curY - drawing.startY);
      if (width > 1 && height > 1) {
        onAdd({
          id: crypto.randomUUID(),
          type: tool as EditElementType,
          page, x, y, width, height,
          strokeColor, fillColor, strokeWidth,
        });
      }
      setDrawing(null);
    }
    setDragging(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || pendingImagePage === null) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onAdd({
        id: crypto.randomUUID(), type: "image",
        page: pendingImagePage, x: 10, y: 10, width: 30, height: 30,
        imageDataUrl: ev.target?.result as string,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    setPendingImagePage(null);
  };

  const toolButtons: { id: EditElementType | "select"; icon: string; label: string }[] = [
    { id: "select", icon: "↖", label: "Select" },
    { id: "text", icon: "T", label: "Text" },
    { id: "image", icon: "🖼", label: "Image" },
    { id: "rectangle", icon: "▭", label: "Rectangle" },
    { id: "circle", icon: "○", label: "Circle" },
    { id: "line", icon: "╱", label: "Line" },
  ];

  const selectedEl = elements.find((el) => el.id === selected);

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
      {/* Hidden image input */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleImageUpload}
      />

      {/* Left toolbar */}
      <div style={{
        width: 200, flexShrink: 0,
        background: "#fff", border: "1px solid #E5E7EB",
        borderRadius: 12, padding: "1rem",
        display: "flex", flexDirection: "column", gap: 10,
        position: "sticky", top: 10,
      }}>
        <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>
          Tools
        </p>

        {/* Tool buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {toolButtons.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              style={{
                padding: "8px 4px", borderRadius: 8, cursor: "pointer",
                border: `1.5px solid ${tool === t.id ? "#4F46E5" : "#E5E7EB"}`,
                background: tool === t.id ? "#EEF2FF" : "#fff",
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 3,
              }}
            >
              <span style={{ fontSize: "1rem" }}>{t.icon}</span>
              <span style={{ fontSize: "0.65rem", color: tool === t.id ? "#4F46E5" : "#6B7280", fontWeight: 500 }}>
                {t.label}
              </span>
            </button>
          ))}
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #E5E7EB" }} />

        {/* Text options */}
        {/* Text options */}
        {tool === "text" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "#374151" }}>Text</p>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your text here…"
              rows={3}
              style={{
                width: "100%", padding: "6px 8px", fontSize: "0.8rem",
                border: "1px solid #E5E7EB", borderRadius: 6,
                resize: "none", outline: "none", color: "#111827",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#4F46E5")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ fontSize: "0.7rem", color: "#6B7280" }}>Size</label>
              <input
                type="number" value={fontSize} min={8} max={72}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                style={{
                  width: 50, padding: "3px 6px", fontSize: "0.75rem",
                  border: "1px solid #E5E7EB", borderRadius: 4, outline: "none",
                }}
              />
            </div>
            <div>
              <p style={{ fontSize: "0.7rem", color: "#6B7280", marginBottom: 4 }}>Color</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setFontColor(c)}
                    style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: c, cursor: "pointer",
                      border: fontColor === c ? "2.5px solid #4F46E5" : "1.5px solid #D1D5DB",
                    }}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={() => setBold(!bold)}
              style={{
                padding: "4px 8px", fontSize: "0.75rem", fontWeight: 700,
                border: `1.5px solid ${bold ? "#4F46E5" : "#E5E7EB"}`,
                borderRadius: 6, background: bold ? "#EEF2FF" : "#fff",
                cursor: "pointer", color: bold ? "#4F46E5" : "#374151",
              }}
            >
              B Bold
            </button>

            {/* Add Text button */}
            <button
              onClick={() => {
                if (!textInput.trim()) return;
                // Place on first page at center
                const targetPage = pages[0]?.page ?? 1;
                const newId = crypto.randomUUID();
                onAdd({
                  id: newId,
                  type: "text",
                  page: targetPage,
                  x: 10, y: 10,
                  width: 40, height: 8,
                  text: textInput,
                  fontSize, fontColor, bold,
                });
                // Auto-switch to select tool and select the new element
                setTool("select");
                setSelected(newId);
              }}
              disabled={!textInput.trim()}
              style={{
                padding: "9px 12px",
                background: textInput.trim() ? "#4F46E5" : "#E5E7EB",
                color: textInput.trim() ? "#fff" : "#9CA3AF",
                border: "none", borderRadius: 8,
                fontSize: "0.8rem", fontWeight: 600,
                cursor: textInput.trim() ? "pointer" : "not-allowed",
                transition: "all 0.15s",
                display: "flex", alignItems: "center",
                justifyContent: "center", gap: 6,
              }}
            >
              + Add text to PDF
            </button>
            <p style={{ fontSize: "0.68rem", color: "#9CA3AF", textAlign: "center" }}>
              Then drag it to the right position
            </p>
          </div>
        )}

        {/* Shape options */}
        {["rectangle", "circle", "line"].includes(tool) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "#374151" }}>Shape Style</p>
            <div>
              <p style={{ fontSize: "0.7rem", color: "#6B7280", marginBottom: 4 }}>Stroke</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setStrokeColor(c)}
                    style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: c, cursor: "pointer",
                      border: strokeColor === c ? "2.5px solid #4F46E5" : "1.5px solid #D1D5DB",
                    }}
                  />
                ))}
              </div>
            </div>
            {tool !== "line" && (
              <div>
                <p style={{ fontSize: "0.7rem", color: "#6B7280", marginBottom: 4 }}>Fill</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  <button
                    onClick={() => setFillColor("transparent")}
                    style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: "white", cursor: "pointer",
                      border: fillColor === "transparent" ? "2.5px solid #4F46E5" : "1.5px solid #D1D5DB",
                      backgroundImage: "linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, white 25%, white 75%, #ccc 75%)",
                      backgroundSize: "6px 6px",
                      backgroundPosition: "0 0, 3px 3px",
                    }}
                  />
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setFillColor(c)}
                      style={{
                        width: 20, height: 20, borderRadius: "50%",
                        background: c, cursor: "pointer",
                        border: fillColor === c ? "2.5px solid #4F46E5" : "1.5px solid #D1D5DB",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ fontSize: "0.7rem", color: "#6B7280" }}>Thickness</label>
              <input
                type="range" min={1} max={10} value={strokeWidth}
                onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                style={{ width: 80 }}
              />
            </div>
          </div>
        )}

        {/* Selected element controls */}
        {tool === "select" && selectedEl && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "#374151" }}>
              Selected: {selectedEl.type}
            </p>
            {selectedEl.type === "text" && (
              <>
                <textarea
                  value={selectedEl.text ?? ""}
                  onChange={(e) => onUpdate(selectedEl.id, { text: e.target.value })}
                  rows={3}
                  style={{
                    width: "100%", padding: "6px 8px", fontSize: "0.8rem",
                    border: "1px solid #E5E7EB", borderRadius: 6,
                    resize: "none", outline: "none",
                  }}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => onUpdate(selectedEl.id, { fontColor: c })}
                      style={{
                        width: 18, height: 18, borderRadius: "50%", background: c, cursor: "pointer",
                        border: selectedEl.fontColor === c ? "2.5px solid #4F46E5" : "1px solid #D1D5DB",
                      }}
                    />
                  ))}
                </div>
              </>
            )}
            <button
              onClick={() => { onRemove(selectedEl.id); setSelected(null); }}
              style={{
                padding: "6px", fontSize: "0.75rem", fontWeight: 500,
                background: "#FEF2F2", color: "#DC2626",
                border: "1px solid #FECACA", borderRadius: 6, cursor: "pointer",
              }}
            >
              🗑 Remove element
            </button>
          </div>
        )}

        <hr style={{ border: "none", borderTop: "1px solid #E5E7EB" }} />

        {/* Elements count */}
        <p style={{ fontSize: "0.7rem", color: "#6B7280", textAlign: "center" }}>
          {elements.length} element{elements.length !== 1 ? "s" : ""} added
        </p>

        {elements.length > 0 && (
          <button
            onClick={() => { elements.forEach(el => onRemove(el.id)); setSelected(null); }}
            style={{
              padding: "6px", fontSize: "0.72rem",
              background: "#fff", color: "#6B7280",
              border: "1px solid #E5E7EB", borderRadius: 6, cursor: "pointer",
            }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* PDF canvas area */}
      <div style={{
        flex: 1,
        display: "flex", flexDirection: "column", gap: 20,
        maxHeight: 650, overflowY: "auto",
        background: "#F3F4F6", borderRadius: 12, padding: 12,
      }}>
        {/* Instruction */}
        <div style={{
          background: "#EEF2FF", border: "1px solid #C7D2FE",
          borderRadius: 8, padding: "8px 12px",
          fontSize: "0.75rem", color: "#4F46E5",
        }}>
          {tool === "select" && "↖ Click any element to select and edit it. Drag to reposition."}
          {tool === "text" && "T Type in the box on the left, then click anywhere on the page to place text."}
          {tool === "image" && "🖼 Click anywhere on the page to insert an image."}
          {["rectangle", "circle", "line"].includes(tool) && "Draw by clicking and dragging on the page."}
        </div>

        {pages.map(({ page, dataUrl }) => {
          const pageElements = elements.filter((el) => el.page === page);
          return (
            <div key={page}>
              <p style={{ fontSize: "0.72rem", color: "#6B7280", marginBottom: 6, textAlign: "center" }}>
                Page {page}
              </p>
              <div
                ref={(el) => { containerRefs.current[page] = el; }}
                onMouseDown={(e) => handleMouseDown(e, page)}
                onMouseMove={(e) => handleMouseMove(e, page)}
                onMouseUp={() => handleMouseUp(page)}
                onMouseLeave={() => { setDrawing(null); setDragging(null); }}
                style={{
                  position: "relative",
                  display: "inline-block",
                  cursor: tool === "select" ? "default"
                    : tool === "text" ? "text"
                    : "crosshair",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
                  borderRadius: 4,
                  overflow: "hidden",
                  userSelect: "none",
                }}
              >
                <img
                  src={dataUrl}
                  alt={`Page ${page}`}
                  style={{ display: "block", width: "100%", maxWidth: 700 }}
                  draggable={false}
                />

                {/* Render elements */}
                {pageElements.map((el) => {
                  const isSelected = selected === el.id;
                  return (
                    <div
                      key={el.id}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        if (tool === "select") {
                          setSelected(el.id);
                          const { x, y } = getPos(e, page);
                          setDragging({ id: el.id, offX: x - el.x, offY: y - el.y });
                        }
                      }}
                      style={{
                        position: "absolute",
                        left: `${el.x}%`, top: `${el.y}%`,
                        width: `${el.width}%`, height: `${el.height}%`,
                        cursor: tool === "select" ? "move" : "default",
                        border: isSelected ? "1.5px dashed #4F46E5" : "none",
                        boxSizing: "border-box",
                        pointerEvents: tool === "select" ? "auto" : "none",
                      }}
                    >
                      {el.type === "text" && (
                        <span style={{
                          fontSize: `${el.fontSize ?? 14}px`,
                          color: el.fontColor ?? "#000",
                          fontWeight: el.bold ? "bold" : "normal",
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.3,
                        }}>
                          {el.text}
                        </span>
                      )}
                      {el.type === "image" && el.imageDataUrl && (
                        <img
                          src={el.imageDataUrl}
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                          draggable={false}
                          alt="added"
                        />
                      )}
                      {el.type === "rectangle" && (
                        <div style={{
                          width: "100%", height: "100%",
                          background: el.fillColor === "transparent" ? "transparent" : el.fillColor,
                          border: `${el.strokeWidth ?? 2}px solid ${el.strokeColor ?? "#000"}`,
                          boxSizing: "border-box",
                        }} />
                      )}
                      {el.type === "circle" && (
                        <div style={{
                          width: "100%", height: "100%", borderRadius: "50%",
                          background: el.fillColor === "transparent" ? "transparent" : el.fillColor,
                          border: `${el.strokeWidth ?? 2}px solid ${el.strokeColor ?? "#000"}`,
                          boxSizing: "border-box",
                        }} />
                      )}
                      {el.type === "line" && (
                        <div style={{
                          position: "absolute", top: "50%",
                          width: "100%", left: 0,
                          borderTop: `${el.strokeWidth ?? 2}px solid ${el.strokeColor ?? "#000"}`,
                        }} />
                      )}

                      {/* Remove button when selected */}
                      {isSelected && (
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove(el.id);
                            setSelected(null);
                          }}
                          style={{
                            position: "absolute", top: -8, right: -8,
                            width: 16, height: 16, borderRadius: "50%",
                            background: "#DC2626", color: "#fff",
                            border: "1.5px solid #fff", fontSize: "9px",
                            cursor: "pointer", padding: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            zIndex: 10,
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Active drawing preview */}
                {drawing && drawing.page === page && (
                  <div style={{
                    position: "absolute",
                    left: `${Math.min(drawing.startX, drawing.curX)}%`,
                    top: `${Math.min(drawing.startY, drawing.curY)}%`,
                    width: `${Math.abs(drawing.curX - drawing.startX)}%`,
                    height: `${Math.abs(drawing.curY - drawing.startY)}%`,
                    border: `${strokeWidth}px dashed ${strokeColor}`,
                    background: fillColor !== "transparent" ? fillColor + "44" : "transparent",
                    pointerEvents: "none",
                    borderRadius: tool === "circle" ? "50%" : 0,
                  }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}