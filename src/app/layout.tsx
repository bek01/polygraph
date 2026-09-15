import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Polygraph — the onchain lie detector',
  description:
    'What the crowd says on Polymarket, plotted against what six classes of onchain capital actually did. Built on the Nansen API.',
  openGraph: {
    title: 'Polygraph — the onchain lie detector',
    description:
      'Prediction-market belief vs. Nansen flow intelligence. The gap between them is the trade.',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
