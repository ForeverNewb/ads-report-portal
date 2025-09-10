
'use client'

import { useState, useEffect } from 'react'
import { AccessGate } from './access-gate'
import { ReportBuilder } from './report-builder'

export function AdsReportPortal() {
  const [hasAccess, setHasAccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user has access stored in localStorage
    const access = localStorage.getItem('ads_portal_access')
    setHasAccess(access === 'granted')
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-lime-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!hasAccess) {
    return <AccessGate onAccess={() => setHasAccess(true)} />
  }

  return <ReportBuilder />
}
