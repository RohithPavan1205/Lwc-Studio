import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LWC Studio | Precision Void Engine",
  description: "Mission Critical Lightning Web Component Development Environment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
