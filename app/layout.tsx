// app/layout.tsx
import type { Metadata } from 'next'
import { Epilogue, Lora, Inter } from 'next/font/google';
import './globals.css'
import { cn } from '@/lib/utils'
import { Header } from './_components/shared/Header';

const epilogue = Epilogue({
  subsets: ['latin'],
  weight: ['900'],
  variable: '--font-epilogue',
  display: 'swap',
});

const lora = Lora({
  subsets: ['latin'],
  weight: ['600'],
  style: ['italic'],
  variable: '--font-lora',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'KI UX-Agent',
  description: 'Sehen Sie Ihre Website durch die Augen Ihrer Nutzer',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={cn(
        epilogue.variable,
        lora.variable,
        inter.variable
      )}
    >
      <body className="min-h-screen bg-background antialiased" style={{ fontFamily: 'var(--font-inter)' }}>
        <Header />
        {children}
      </body>
    </html>
  );
}
