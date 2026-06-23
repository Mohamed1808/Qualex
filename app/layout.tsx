'use client'

import './globals.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useState } from 'react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
          },
        },
      })
  )

  return (
    <html lang="en" className="dark">
      <head>
        <title>Qualex — Drive Finance</title>
        <meta name="description" content="Automotive Finance Lead Management System" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-[#0f0f0f] text-white antialiased">
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster
            position="top-right"
            richColors
            theme="dark"
            toastOptions={{
              style: {
                background: '#161616',
                border: '1px solid #2a2a2a',
                color: '#f0f0f0',
              },
            }}
          />
        </QueryClientProvider>
      </body>
    </html>
  )
}
