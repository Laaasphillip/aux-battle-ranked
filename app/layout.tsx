import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'Aux Battle Ranked',
  description: 'Put your music taste to the test. Battle head-to-head and let the crowd decide.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="min-h-screen">
        {children}
        <p className="fixed bottom-4 right-5 text-sm font-semibold text-white tracking-widest pointer-events-none select-none">
          Created by neveragaxn
        </p>
      </body>
    </html>
  )
}
