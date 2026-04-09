import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ArmoryMetrics AR',
  description: 'Sistema de trazabilidad y balística para tiro deportivo y armería profesional — Argentina',
  manifest: '/manifest.json',
  keywords: ['tiro deportivo', 'armería', 'ANMaC', 'RENAVE', 'balística', 'Argentina'],
  authors: [{ name: 'ArmoryMetrics AR' }],
};

export const viewport: Viewport = {
  themeColor: '#0c111d',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0c111d] text-slate-100 font-mono antialiased">
        {children}
      </body>
    </html>
  );
}
