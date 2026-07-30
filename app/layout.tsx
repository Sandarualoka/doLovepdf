import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "DoLovePDF — Free Online PDF Tools",
    template: "%s | DoLovePDF",
  },
  description:
    "Free online PDF toolkit — merge, split, compress, convert, edit, sign and protect PDF files. No sign up. No watermark. Files never leave your device.",
  keywords: [
    "pdf tools",
    "merge pdf",
    "split pdf",
    "compress pdf",
    "pdf to word",
    "pdf to jpg",
    "sign pdf",
    "edit pdf",
    "free pdf editor",
    "adobe alternative",
    "online pdf",
    "dolovepdf",
  ],
  authors: [{ name: "DoLovePDF", url: "https://www.dolovepdf.com" }],
  creator: "DoLovePDF",
  publisher: "DoLovePDF",
  metadataBase: new URL("https://www.dolovepdf.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.dolovepdf.com",
    siteName: "DoLovePDF",
    title: "DoLovePDF — Free Online PDF Tools",
    description:
      "Free online PDF toolkit — merge, split, compress, convert, edit, sign and protect PDF files. No sign up. No watermark. Files never leave your device.",
    images: [
      {
        url: "https://res.cloudinary.com/dzwv7wvdp/image/upload/v1782796812/logo_vjke3b-removebg-preview_gqehfz.png",
        width: 1200,
        height: 630,
        alt: "DoLovePDF — Free Online PDF Tools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DoLovePDF — Free Online PDF Tools",
    description:
      "Free online PDF toolkit — merge, split, compress, convert, edit, sign and protect PDF files. No sign up. No watermark.",
    images: [
      "https://res.cloudinary.com/dzwv7wvdp/image/upload/v1782796812/logo_vjke3b-removebg-preview_gqehfz.png",
    ],
    creator: "@dolovepdf",
  },
  icons: {
    icon: [
      {
        url: "https://res.cloudinary.com/dzwv7wvdp/image/upload/v1782796812/logo_vjke3b-removebg-preview_gqehfz.png",
        sizes: "any",
      },
    ],
    shortcut:
      "https://res.cloudinary.com/dzwv7wvdp/image/upload/v1782796812/logo_vjke3b-removebg-preview_gqehfz.png",
    apple:
      "https://res.cloudinary.com/dzwv7wvdp/image/upload/v1782796812/logo_vjke3b-removebg-preview_gqehfz.png",
  },
  verification: {
    google: "hG4EBJSyIhHIUwn-Q3oHIFLe2np7_6UeCwzmPJbhOuA",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}