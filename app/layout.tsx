import './globals.css'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { MessageProvider } from '@/contexts/message-context'
import { PusherProvider } from '@/contexts/pusher-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Slack Clone',
  description: 'A real-time chat application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
} 