import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Normy Docs',
  description: 'AI-powered form validation — installation, SDK reference, and deployment guides',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
