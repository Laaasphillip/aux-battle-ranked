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
        <p className="fixed bottom-3 right-4 text-[10px] text-[#555] pointer-events-none select-none tracking-wider">
          Created by neveragaxn
        </p>
      </body>
    </html>
  )
}
