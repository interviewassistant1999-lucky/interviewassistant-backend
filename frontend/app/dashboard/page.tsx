'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'

interface SessionSummary {
  id: string
  duration_seconds: number
  created_at: string
}

interface DashboardStats {
  totalSessions: number
  totalMinutes: number
  thisWeekSessions: number
  thisWeekMinutes: number
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { fetchWithAuth } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalSessions: 0,
    totalMinutes: 0,
    thisWeekSessions: 0,
    thisWeekMinutes: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetchWithAuth('/api/sessions')
        if (!response.ok) return

        const sessions: SessionSummary[] = await response.json()

        // Calculate stats
        const now = new Date()
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        let totalMinutes = 0
        let thisWeekSessions = 0
        let thisWeekMinutes = 0

        sessions.forEach((session) => {
          const mins = Math.floor(session.duration_seconds / 60)
          totalMinutes += mins

          const sessionDate = new Date(session.created_at)
          if (sessionDate >= weekAgo) {
            thisWeekSessions++
            thisWeekMinutes += mins
          }
        })

        setStats({
          totalSessions: sessions.length,
          totalMinutes,
          thisWeekSessions,
          thisWeekMinutes,
        })
      } catch (err) {
        console.error('Failed to load stats:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
  }, [fetchWithAuth])

  const displayStats = [
    {
      label: 'Total Sessions',
      value: isLoading ? '...' : stats.totalSessions.toString(),
      change: `+${stats.thisWeekSessions} this week`,
    },
    {
      label: 'Practice Time',
      value: isLoading ? '...' : `${stats.totalMinutes} min`,
      change: `+${stats.thisWeekMinutes} min this week`,
    },
    {
      label: 'Sessions This Week',
      value: isLoading ? '...' : stats.thisWeekSessions.toString(),
      change: 'Keep practicing!',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-slate-600 mt-1">
          Here&apos;s an overview of your interview practice progress.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {displayStats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{stat.value}</p>
            <p className="text-sm text-slate-400 mt-1">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/interview"
            className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition"
          >
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-900">Start New Interview</p>
              <p className="text-sm text-slate-500">Begin a practice session</p>
            </div>
          </Link>

          <Link
            href="/dashboard/sessions"
            className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-900">View Past Sessions</p>
              <p className="text-sm text-slate-500">Review transcripts and suggestions</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Subscription status */}
      {user?.subscription_tier === 'free' && (
        <div className="mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Upgrade to Pro</h3>
          <p className="text-blue-100 mb-4">
            Get unlimited sessions, all LLM providers, and permanent session storage.
          </p>
          <Link
            href="/dashboard/billing"
            className="inline-block px-4 py-2 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition"
          >
            View Plans
          </Link>
        </div>
      )}
    </div>
  )
}
