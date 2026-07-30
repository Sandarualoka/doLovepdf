"use client";
import { useState } from "react";
import { TOOLS, CATEGORIES, Tool, ToolCategory } from "@/lib/tools";
import ToolView from "@/components/ToolView";
import Navbar from "@/components/Navbar";
import TechBackground from "@/components/TechBackground";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>("all");
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [search, setSearch] = useState("");

  const filtered = TOOLS.filter((t) => {
    const matchCat = activeCategory === "all" || t.category === activeCategory;
    const matchSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const groupedByCategory =
    activeCategory === "all"
      ? CATEGORIES.filter((c) => c.id !== "all").reduce(
          (acc, cat) => {
            const items = filtered.filter((t) => t.category === cat.id);
            if (items.length) acc[cat.id] = { label: cat.label, items };
            return acc;
          },
          {} as Record<string, { label: string; items: Tool[] }>
        )
      : null;

  return (
    <>
      <TechBackground />
      <Navbar />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.25rem", position: "relative", zIndex: 1 }}>
        {activeTool ? (
          <ToolView tool={activeTool} onBack={() => setActiveTool(null)} />
        ) : (
          <>
            {/* Hero */}
            <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
              <h1
                style={{
                  fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: "0.6rem",
                  letterSpacing: "-0.02em",
                }}
              >
                Every PDF tool you need,{" "}
<span className="bg-gradient-to-r from-[#FF3B5C] via-[#E91E63] to-[#6C2BD9] bg-clip-text text-transparent">
  in one place
</span>              </h1>
              <p
                style={{
                  fontSize: "1rem",
                  color: "#6B7280",
                  maxWidth: 520,
                  margin: "0 auto 1.5rem",
                  lineHeight: 1.6,
                }}
              >
                Merge, split, compress, convert and edit PDF files free,
                fast, and processed entirely in your browser.
              </p>

              {/* Search */}
              <div
                style={{
                  maxWidth: 400,
                  margin: "0 auto",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: 13,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "1rem",
                    pointerEvents: "none",
                  }}
                >
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search tools…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px 10px 38px",
                    border: "1.5px solid #E5E7EB",
                    borderRadius: 12,
                    fontSize: "0.9rem",
                    outline: "none",
                    color: "#111827",
                    background: "#fff",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#4F46E5")}
                  onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                />
              </div>
            </div>

            {/* Category Tabs */}
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: "2rem",
                justifyContent: "center",
              }}
            >
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  className={`tab-btn ${activeCategory === cat.id ? "active" : ""}`}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSearch("");
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Tool Grid */}
            {groupedByCategory ? (
              Object.entries(groupedByCategory).map(([catId, { label, items }]) => (
                <div key={catId} style={{ marginBottom: "2.5rem" }}>
                  <h2
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "#9CA3AF",
                      marginBottom: "1rem",
                    }}
                  >
                    {label}
                  </h2>
                  <ToolGrid tools={items} onSelect={setActiveTool} />
                </div>
              ))
            ) : (
              <>
                {filtered.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "3rem", color: "#9CA3AF" }}>
                    <p style={{ fontSize: "2rem", marginBottom: 8 }}>🔍</p>
                    <p style={{ fontSize: "0.9rem" }}>
                      No tools found for &ldquo;{search}&rdquo;
                    </p>
                  </div>
                ) : (
                  <ToolGrid tools={filtered} onSelect={setActiveTool} />
                )}
              </>
            )}

            {/* Stats strip */}
            <div
              style={{
                marginTop: "3rem",
                padding: "1.5rem",
                background: "#EEF2FF",
                borderRadius: 16,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "1rem",
                textAlign: "center",
              }}
            >
              {[
                { num: "100%", label: "Free to use" },
                { num: "19", label: "PDF tools available" },
                { num: "0", label: "Files uploaded to servers" },
                { num: "∞", label: "Files you can process" },
              ].map((s) => (
                <div key={s.label}>
                  <p style={{ fontSize: "1.6rem", fontWeight: 700, color: "#4F46E5" }}>
                    {s.num}
                  </p>
                  <p style={{ fontSize: "0.78rem", color: "#6B7280" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid #E5E7EB",
          padding: "1.5rem 1.25rem",
          textAlign: "center",
          marginTop: "3rem",
        }}
      >
        <p style={{ fontSize: "0.78rem", color: "#9CA3AF" }}>
          PDF Tools — All processing happens in your browser. Your files never leave your device.
        </p>
      </footer>
    </>
  );
}

function ToolGrid({
  tools,
  onSelect,
}: {
  tools: Tool[];
  onSelect: (t: Tool) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 12,
      }}
    >
      {tools.map((tool) => (
        <button
          key={tool.id}
          className="tool-card"
          onClick={() => onSelect(tool)}
          style={{ textAlign: "left", cursor: "pointer", border: "1px solid #E5E7EB" }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              background: tool.bg,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
              flexShrink: 0,
            }}
          >
            {tool.icon}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#111827" }}>
                {tool.name}
              </span>
              {tool.badge && (
                <span className={`badge badge-${tool.badge}`}>{tool.badge}</span>
              )}
            </div>
            <p style={{ fontSize: "0.75rem", color: "#6B7280", lineHeight: 1.4 }}>
              {tool.description}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
