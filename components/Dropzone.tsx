"use client";
import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { formatBytes } from "@/lib/pdf-utils";

interface DropzoneProps {
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  files: File[];
  onRemove: (index: number) => void;
}

export default function Dropzone({
  accept,
  multiple = false,
  onFiles,
  files,
  onRemove,
}: DropzoneProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length) onFiles(dropped);
    },
    [onFiles]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const fileIcon = (name: string) => {
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(name)) return "🖼️";
    if (/\.(doc|docx)$/i.test(name)) return "📝";
    return "📄";
  };

  return (
    <div>
      <label
        className={`dropzone-area block ${dragActive ? "active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        style={{ cursor: "pointer" }}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="sr-only"
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "#EEF2FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Upload size={22} color="#4F46E5" />
          </div>
          <div>
            <p
              style={{
                fontWeight: 500,
                fontSize: "0.95rem",
                color: "#111827",
                marginBottom: 4,
              }}
            >
              Drop your file{multiple ? "s" : ""} here
            </p>
            <p style={{ fontSize: "0.8rem", color: "#6B7280" }}>
              or{" "}
              <span style={{ color: "#4F46E5", fontWeight: 500 }}>
                browse
              </span>{" "}
              from your device
            </p>
          </div>
          <p style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>
            Accepted: {accept.replace(/\./g, "").toUpperCase()}
          </p>
        </div>
      </label>

      {files.length > 0 && (
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: 8 }}>
          {files.map((file, i) => (
            <div key={i} className="file-pill">
              <span style={{ fontSize: "1.2rem" }}>{fileIcon(file.name)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    color: "#111827",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {file.name}
                </p>
                <p style={{ fontSize: "0.72rem", color: "#6B7280" }}>
                  {formatBytes(file.size)}
                </p>
              </div>
              <button
                onClick={() => onRemove(i)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9CA3AF",
                  fontSize: "1.1rem",
                  lineHeight: 1,
                  padding: "2px 4px",
                }}
                aria-label="Remove file"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
