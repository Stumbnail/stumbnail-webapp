import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stumbnail - Create Stunning Thumbnails',
  description: 'Login to access and start creating amazing thumbnails',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
