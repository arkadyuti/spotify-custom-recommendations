import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { Toaster } from './components/ui/sonner'
import Index from './pages/Index'
import './index.css'

const queryClient = new QueryClient()

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Index />
          <Toaster />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  </React.StrictMode>
);
