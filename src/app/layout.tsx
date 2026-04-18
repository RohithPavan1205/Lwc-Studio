/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LWC Studio — Design-First LWC Development',
  description:
    'LWC Studio is a modern developer platform for building, previewing, and deploying Lightning Web Components with speed and precision.',
  keywords: ['Salesforce', 'LWC', 'Lightning Web Components', 'Design System', 'Developer Tools', 'LWC Studio'],
  openGraph: {
    title: 'LWC Studio — Design-First LWC Development',
    description: 'Build, preview, and deploy Lightning Web Components with speed and precision.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,600,700,800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
