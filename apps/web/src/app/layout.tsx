import type { Metadata, Viewport } from 'next';
import { Coque } from '@/components/Coque';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tu as pris mon maillot ?',
  description: 'La liste de valise de chaque membre de la famille, adaptée au voyage, et le pointage avant de partir.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a2027' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <Coque>{children}</Coque>
      </body>
    </html>
  );
}
