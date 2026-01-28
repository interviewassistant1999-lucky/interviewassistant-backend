'use client'

import { useEffect, useState } from 'react'

interface BrowserCheckProps {
  children: React.ReactNode
}

interface BrowserSupport {
  supported: boolean
  reason?: string
}

function checkBrowserSupport(): BrowserSupport {
  // Check if running on client
  if (typeof window === 'undefined') {
    return { supported: true }
  }

  const userAgent = navigator.userAgent

  // Check for Chrome (but not Edge)
  const isChrome = /Chrome/.test(userAgent) && !/Edg/.test(userAgent)
  // Check for Edge
  const isEdge = /Edg/.test(userAgent)

  if (!isChrome && !isEdge) {
    return {
      supported: false,
      reason:
        'This app requires Chrome or Edge for system audio capture. Please switch browsers.',
    }
  }

  // Check for required APIs
  if (!navigator.mediaDevices?.getDisplayMedia) {
    return {
      supported: false,
      reason:
        'Your browser version does not support required audio features. Please update your browser.',
    }
  }

  return { supported: true }
}

export function BrowserCheck({ children }: BrowserCheckProps) {
  const [support, setSupport] = useState<BrowserSupport>({ supported: true })
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    setSupport(checkBrowserSupport())
  }, [])

  // During SSR or before check, show nothing
  if (!isClient) {
    return null
  }

  if (!support.supported) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-bg-secondary rounded-lg p-8 text-center">
          <div className="text-6xl mb-6">🚫</div>
          <h1 className="text-2xl font-bold mb-4 text-accent-red">
            Browser Not Supported
          </h1>
          <p className="text-text-secondary mb-6">{support.reason}</p>
          <div className="space-y-3">
            <a
              href="https://www.google.com/chrome/"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 px-4 bg-accent-blue hover:bg-blue-600 rounded-lg transition-colors"
            >
              Download Chrome
            </a>
            <a
              href="https://www.microsoft.com/edge"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 px-4 bg-bg-tertiary hover:bg-gray-700 rounded-lg transition-colors border border-border"
            >
              Download Edge
            </a>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
