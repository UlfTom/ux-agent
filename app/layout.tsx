// app/layout.tsx
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'; 
import './globals.css'
import { cn } from '@/lib/utils' 

export const metadata: Metadata = {
  title: 'KI UX-Agent',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body 
        className={cn(
          // HIER: Wir nehmen ein helleres Grau (fast weiß) für den DeepL-Look
          "min-h-screen bg-slate-50 font-sans", 
          GeistSans.className
        )}
      >
        {children}
      </body>
    </html>
  )
}