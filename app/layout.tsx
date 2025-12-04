import type { Metadata } from 'next';
import { Space_Grotesk, Lexend } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-lexend',
  display: 'swap',
});

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
    <html lang="en" className={`${spaceGrotesk.variable} ${lexend.variable}`}>
      <body>{children}</body>
    </html>
  );
}
