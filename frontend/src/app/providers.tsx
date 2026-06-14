'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth'

function StoreHydration() {
  useEffect(() => {
    useAuthStore.persist.rehydrate()
  }, [])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000, retry: 1 },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        <StoreHydration />
        {children}
        <Toaster position="top-right" />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
