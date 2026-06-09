import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Consultor SEO & Marketing Digital",
  description: "Plataforma de consultoría SEO multi-agente impulsada por IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen bg-background text-foreground">{children}</body>
    </html>
  );
}
