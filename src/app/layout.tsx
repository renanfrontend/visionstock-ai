import "@fontsource-variable/unbounded";
import "@fontsource-variable/manrope";
import "@fontsource-variable/jetbrains-mono";
import type { Metadata, Viewport } from "next";
import { AUTHOR } from "@/features/legal/legal";
import "./globals.css";

export const metadata: Metadata = {
  title: "VisionStock — Catálogo, estoque e vitrine com IA",
  description:
    "Envie a foto de um produto e receba título, descrição, categoria, cores e tags de SEO prontos para revisar.",
  authors: [{ name: AUTHOR.name, url: AUTHOR.profileUrl }],
  creator: AUTHOR.name,
  publisher: AUTHOR.name,
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
