// app/layout.tsx
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans';
import './globals.css'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'; // Importieren
import { Bot, Settings } from 'lucide-react'; // Importieren

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
          "min-h-screen bg-slate-50 font-sans", // Heller Hintergrund (DeepL-Stil)
          GeistSans.className
        )}
      >
        {/* ==============================================
          DER GLOBALE "GLASS"-HEADER
          ==============================================
        */}
        <header
          className="fixed top-4 left-1/2 -translate-x-1/2 z-10 
                     flex items-center justify-between
                     w-[90vw] max-w-5xl px-4 py-3 
                     rounded-lg border border-white/20 
                     bg-white/50 shadow-md backdrop-blur-lg"
        >
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold text-foreground">KI UX-Agent</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-foreground">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* ==============================================
          DER SEITENINHALT (wird hier eingefügt)
          ==============================================
        */}
        {children}

      </body>
    </html>
  )
}