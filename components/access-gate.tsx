
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Key, AlertCircle } from 'lucide-react'

interface AccessGateProps {
  onAccess: () => void
}

export function AccessGate({ onAccess }: AccessGateProps) {
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Simulate a brief loading state
    setTimeout(() => {
      if (accessCode === 'Admin-98765') {
        localStorage.setItem('ads_portal_access', 'granted')
        onAccess()
      } else {
        setError('Invalid access code. Please try again.')
      }
      setIsLoading(false)
    }, 500)
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md dark-card">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-lime-500/10 rounded-full flex items-center justify-center">
              <Key className="w-8 h-8 lime-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Access Required</h1>
              <p className="text-gray-400">Enter your access code to continue to the Ads Report Portal</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter access code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder-gray-400 focus:border-lime-500"
                required
              />
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full lime-bg text-black hover:bg-lime-400 font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Access Portal'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
