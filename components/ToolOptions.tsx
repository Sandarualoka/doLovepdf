"use client";
import { useState } from "react";

// ── Compress Options ──────────────────────────────────────────────────────────
export function CompressOptions({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const opts = [
    { val: "low", label: "Low compression", sub: "Best quality, larger file" },
    { val: "medium", label: "Medium", sub: "Balanced size & quality" },
    { val: "high", label: "High compression", sub: "Smallest file, lower quality" },
  ];
  return (
    <div>
      <p style={{ fontSize: "0.85rem", fontWeight: 500, marginBottom: 10, color: "#374151" }}>
        Compression level
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {opts.map((o) => (
          <label
            key={o.val}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              border: `1.5px solid ${value === o.val ? "#4F46E5" : "#E5E7EB"}`,
              borderRadius: 10,
              cursor: "pointer",
              background: value === o.val ? "#EEF2FF" : "#fff",
              transition: "all 0.15s",
            }}
          >
            <input
              type="radio"
              name="compress"
              value={o.val}
              checked={value === o.val}
              onChange={() => onChange(o.val)}
              style={{ accentColor: "#4F46E5" }}
            />
            <div>
              <p style={{ fontSize: "0.85rem", fontWeight: 500, color: "#111827" }}>
                {o.label}
              </p>
              <p style={{ fontSize: "0.75rem", color: "#6B7280" }}>{o.sub}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Rotate Options ────────────────────────────────────────────────────────────
export function RotateOptions({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const opts = [
    { val: "90", label: "90° clockwise", icon: "↻" },
    { val: "180", label: "180°", icon: "↔" },
    { val: "270", label: "90° counter-clockwise", icon: "↺" },
  ];
  return (
    <div>
      <p style={{ fontSize: "0.85rem", fontWeight: 500, marginBottom: 10, color: "#374151" }}>
        Rotation angle
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {opts.map((o) => (
          <button
            key={o.val}
            onClick={() => onChange(o.val)}
            style={{
              padding: "14px 8px",
              border: `1.5px solid ${value === o.val ? "#4F46E5" : "#E5E7EB"}`,
              borderRadius: 10,
              cursor: "pointer",
              background: value === o.val ? "#EEF2FF" : "#fff",
              textAlign: "center",
              transition: "all 0.15s",
            }}
          >
            <div style={{ fontSize: "1.4rem", marginBottom: 4 }}>{o.icon}</div>
            <p style={{ fontSize: "0.75rem", color: value === o.val ? "#4F46E5" : "#374151", fontWeight: 500 }}>
              {o.label}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Watermark Options ─────────────────────────────────────────────────────────
export function WatermarkOptions({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p style={{ fontSize: "0.85rem", fontWeight: 500, marginBottom: 8, color: "#374151" }}>
        Watermark text
      </p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. CONFIDENTIAL"
        style={{
          width: "100%",
          padding: "10px 14px",
          border: "1.5px solid #E5E7EB",
          borderRadius: 10,
          fontSize: "0.9rem",
          outline: "none",
          transition: "border 0.15s",
          color: "#111827",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#4F46E5")}
        onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
      />
    </div>
  );
}

// ── Page Range Options ────────────────────────────────────────────────────────
export function PageRangeOptions({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <p style={{ fontSize: "0.85rem", fontWeight: 500, marginBottom: 4, color: "#374151" }}>
        {label}
      </p>
      <p style={{ fontSize: "0.75rem", color: "#6B7280", marginBottom: 8 }}>
        Enter page numbers separated by commas (e.g. 1, 3, 5)
      </p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "10px 14px",
          border: "1.5px solid #E5E7EB",
          borderRadius: 10,
          fontSize: "0.9rem",
          outline: "none",
          color: "#111827",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#4F46E5")}
        onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
      />
    </div>
  );
}

// ── Password Options ──────────────────────────────────────────────────────────
export function PasswordOptions({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <p style={{ fontSize: "0.85rem", fontWeight: 500, marginBottom: 8, color: "#374151" }}>
        {label}
      </p>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter password"
          style={{
            width: "100%",
            padding: "10px 40px 10px 14px",
            border: "1.5px solid #E5E7EB",
            borderRadius: 10,
            fontSize: "0.9rem",
            outline: "none",
            color: "#111827",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#4F46E5")}
          onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
        />
        <button
          onClick={() => setShow(!show)}
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#6B7280",
            fontSize: "0.75rem",
          }}
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}


//tst2