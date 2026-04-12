import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { DM_Mono } from 'next/font/google';
import './globals.css';

// Geist is available as a local font in the project
const geist = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-dm-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LWCForge — Build Lightning Web Components 10x Faster',
  description:
    'Write LWC code in your browser. Preview renders in your actual Salesforce org instantly. No 30-second deploy wait.',
  keywords: ['Salesforce', 'LWC', 'Lightning Web Components', 'IDE', 'Developer Tools'],
  openGraph: {
    title: 'LWCForge — Build LWC 10x Faster',
    description: 'Write LWC code in your browser. Preview renders in your Salesforce org instantly.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${dmMono.variable}`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" style={{ fontFamily: 'var(--font-geist), Geist, -apple-system, BlinkMacSystemFont, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
