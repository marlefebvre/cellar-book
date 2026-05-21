import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cellar Book',
  description: 'Gestion de cave à vin',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
