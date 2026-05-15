import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const _inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Sistema de Gestion - Asociacion de Espina Bifida',
  description: 'Sistema administrativo para la gestion de beneficiarios, membresias, servicios, inventario y citas de la Asociacion de Espina Bifida.',
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="bottom-right" gap={8} duration={3500} />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
