import "@fontsource-variable/unbounded";
import "@fontsource-variable/manrope";
import "@fontsource-variable/jetbrains-mono";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VisionStock — Catálogo, estoque e vitrine com IA",
  description:
    "Envie a foto de um produto e receba título, descrição, categoria, cores e tags de SEO prontos para revisar.",
};

export const viewport: Viewport = {
  themeColor: "#04050c",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
