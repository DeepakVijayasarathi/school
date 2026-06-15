import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

const isProd = process.env.NODE_ENV === 'production'

export const metadata: Metadata = {
  title: {
    default:  'SchoolKart ERP',
    template: '%s · SchoolKart ERP',
  },
  description: 'Complete School Management System — students, attendance, fees, HR, and more.',
  robots: isProd ? { index: true, follow: true } : { index: false, follow: false },
  themeColor: '#6366f1',
  icons: { icon: '/favicon.ico' },
  openGraph: {
    type:        'website',
    siteName:    'SchoolKart ERP',
    title:       'SchoolKart ERP',
    description: 'Complete School Management System — students, attendance, fees, HR, and more.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
