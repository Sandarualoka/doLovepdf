"use client";
import { useState, useRef } from "react";
import { SIGNATURE_FONTS, type SignaturePlacement } from "@/lib/pdf-utils";

const FONT_STYLE_MAP: Record<string, string> = {
  "Dancing Script": "'Dancing Script', cursive",
  "Great Vibes": "'Great Vibes', cursive",
  "Pacifico": "'Pacifico', cursive",
  "Sacramento": "'Sacramento', cursive",
  "Allura": "'Allura', cursive",
};

interface SignEditorProps {
  pages: { page: number; dataUrl: string }[];
  signatures: SignaturePlacement[];
  onAddSignature: (sig: SignaturePlacement) => void;
  onRemoveSignature: (index: number) => void;
  onMoveSignature: (index: number, x: number, y: number) => void;
}

export default function SignEditor({
  pages,
  signatures,
  onAddSignature,
  onRemoveSignature,
  onMoveSignature,
}: SignEditorProps) {
  const [step, setStep] = useState<"type" | "place">("type");
  const [signatureText, setSignatureText] = useState("");
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const containerRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleCreateSignature = () => {
    if (!signatureText.trim()) return;
    setStep("place");
  };

  const handlePagePlace = (e: React.MouseEvent, page: number) => {
    if (draggingIndex !== null) return; // dragging an existing sig, not placing new
    const el = containerRefs.current[page];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    onAddSignature({
      page,
      x: Math.max(0, Math.min(85, x)),
      y: Math.max(0, Math.min(92, y)),
      width: 22,
      text: signatureText,
      fontFamily: selectedFont,
    });
  };

 const handleDragStart = (index: number) => setDraggingIndex(index);

  const handleDragOverPage = (e: React.MouseEvent, page: number) => {
    if (draggingIndex === null) return;
    e.preventDefault();
    const el = containerRefs.current[page];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onMoveSignature(draggingIndex, Math.max(0, Math.min(85, x)), Math.max(0, Math.min(92, y)));
  };

  const handleDropOnPage = () => {
    setDraggingIndex(null);
  };

  return (
    <div>
      {/* Load cursive fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Great+Vibes&family=Pacifico&family=Sacramento&family=Allura&display=swap"
        rel="stylesheet"
      />

      {step === "type" && (
        <div>
          <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#111827", marginBottom: 4 }}>
            Type your signature
          </p>
          <p style={{ fontSize: "0.75rem", color: "#6B7280", marginBottom: 12 }}>
            Enter your name, then pick a style you like
          </p>

          <input
            type="text"
            value={signatureText}
            onChange={(e) => setSignatureText(e.target.value)}
            placeholder="e.g. John Smith"
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "1.5px solid #E5E7EB",
              borderRadius: 10,
              fontSize: "1rem",
              outline: "none",
              color: "#111827",
              marginBottom: 18,
            }}
            onFocus={(e) => (e.target.style.borderColor = "#4F46E5")}
            onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
          />

          {signatureText.trim() && (
            <>
              <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: 10 }}>
                Choose a style
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
                {SIGNATURE_FONTS.map((font) => (
                  <button
                    key={font}
                    onClick={() => setSelectedFont(font)}
                    style={{
                      padding: "16px 20px",
                      border: `2px solid ${selectedFont === font ? "#4F46E5" : "#E5E7EB"}`,
                      borderRadius: 12,
                      background: selectedFont === font ? "#EEF2FF" : "#fff",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONT_STYLE_MAP[font],
                        fontSize: "1.9rem",
                        color: "#1E1B4B",
                      }}
                    >
                      {signatureText}
                    </span>
                    {selectedFont === font && (
                      <span style={{
                        width: 22, height: 22, borderRadius: "50%",
                        background: "#4F46E5", color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.75rem", flexShrink: 0,
                      }}>
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={handleCreateSignature}
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
              >
                Continue — place signature on document
              </button>
            </>
          )}
        </div>
      )}

      {step === "place" && (
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
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <span>✍️ Click anywhere on the document to place your signature. Drag to reposition.</span>
            <button
              onClick={() => setStep("type")}
              style={{
                background: "none", border: "none", color: "#4F46E5",
                fontWeight: 600, fontSize: "0.75rem", cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              ← Change style
            </button>
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
          >
            {pages.map(({ page, dataUrl }) => {
              const pageSigs = signatures
                .map((s, i) => ({ ...s, index: i }))
                .filter((s) => s.page === page);

              return (
                <div key={page} style={{ position: "relative", margin: "0 auto" }}>
                  <p style={{ fontSize: "0.72rem", color: "#6B7280", marginBottom: 6, textAlign: "center" }}>
                    Page {page}
                  </p>
                  <div
                    ref={(el) => { containerRefs.current[page] = el; }}
                    onClick={(e) => handlePagePlace(e, page)}
                    onMouseUp={handleDropOnPage}
                    onMouseMove={(e) => handleDragOverPage(e, page)}
                    onMouseLeave={handleDropOnPage}
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

                    {pageSigs.map((s) => (
                      <div
                        key={s.index}
                        style={{
                          position: "absolute",
                          left: `${s.x}%`,
                          top: `${s.y}%`,
                        }}
                      >
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            handleDragStart(s.index);
                          }}
                          title="Drag to move"
                          style={{
                            position: "relative",
                            fontFamily: FONT_STYLE_MAP[s.fontFamily],
                            fontSize: "1.6rem",
                            color: "#1E1B4B",
                            cursor: draggingIndex === s.index ? "grabbing" : "grab",
                            padding: "2px 22px 2px 8px",
                            background: "rgba(255,255,255,0.55)",
                            border: `1px dashed ${draggingIndex === s.index ? "#7C3AED" : "#4F46E5"}`,
                            borderRadius: 4,
                            userSelect: "none",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s.text}

                          {/* Tiny remove button */}
                          <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveSignature(s.index);
                            }}
                            title="Remove signature"
                            style={{
                              position: "absolute",
                              top: -7,
                              right: -7,
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              background: "#DC2626",
                              color: "#fff",
                              border: "1.5px solid #fff",
                              fontSize: "9px",
                              lineHeight: 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              padding: 0,
                              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {signatures.length > 0 && (
            <p style={{ marginTop: 10, fontSize: "0.78rem", color: "#6B7280", textAlign: "center" }}>
              {signatures.length} signature{signatures.length !== 1 ? "s" : ""} placed — drag to move, double-click to remove
            </p>
          )}
        </div>
      )}
    </div>
  );
}