import React from 'react';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Normy — AI-Powered Form Validation & Semantic Feedback Engine',
  description: 'Normy is an open-source AI form runtime that validates user input semantically in real time. Replace regex with intelligent context-aware validation, quality scoring, and guided user feedback.',
  keywords: ['AI form validation', 'semantic validation', 'form feedback', 'React SDK', 'open source', 'Normy', 'AI form runtime'],
  authors: [{ name: 'Normy Team' }],
  creator: 'Normy',
  metadataBase: new URL('https://normy.dev'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Normy',
    title: 'Normy — AI-Powered Form Validation & Semantic Feedback Engine',
    description: 'Replace regex with intelligent AI validation. Normy analyzes input context and semantics in real time to guide users toward quality responses.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Normy — AI-Powered Form Validation',
    description: 'Open-source AI form runtime with real-time semantic validation, quality scoring, and guided feedback.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

import { AuthProvider } from '../components/providers/AuthProvider.js';
import { DataProvider } from '../components/providers/DataProvider.js';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body>
        <AuthProvider>
          <DataProvider>
            {children}
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
