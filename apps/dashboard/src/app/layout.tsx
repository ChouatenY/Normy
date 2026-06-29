import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Normy Developer Dashboard',
  description: 'AI-driven form validation and semantic analytics console.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
