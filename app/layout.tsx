import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Finanzas Tracker",
  description: "Voice-first personal finance & investment tracker",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Finanzas Tracker",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`dark ${GeistSans.variable} ${GeistMono.variable}`}
      style={{ colorScheme: "dark" }}
    >
      <body className="min-h-screen bg-background text-foreground font-sans antialiased pb-safe">
        {children}
      </body>
    </html>
  );
}
