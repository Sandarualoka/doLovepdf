"use client";

export default function Navbar() {
  return (
    <header
      style={{
        background: "rgba(255, 255, 255, 0.72)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid #E5E7EB",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "0 1.25rem",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="https://res.cloudinary.com/dzwv7wvdp/image/upload/v1782796812/logo_vjke3b-removebg-preview_gqehfz.png"
              alt="PDF Tools Logo"
              style={{
                height: 94,
                width: "auto",
                display: "block",
              }}
            />
          </div>
        </div>

        <nav style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <a
            href="#"
            style={{ fontSize: "0.85rem", color: "#6B7280", textDecoration: "none" }}
          >
            All Tools
          </a>
          <a
            href="#"
            style={{ fontSize: "0.85rem", color: "#6B7280", textDecoration: "none" }}
          >
            How it works
          </a>
          <a
            href="#"
            style={{ fontSize: "0.85rem", color: "#6B7280", textDecoration: "none" }}
          >
            Privacy
          </a>
        </nav>
      </div>
    </header>
  );
}
