import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
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
    <html lang="es">
      <body suppressHydrationWarning className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
