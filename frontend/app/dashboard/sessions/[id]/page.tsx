'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

interface TranscriptEntry {
  id: string
  speaker: string
  text: string
  timestamp: number
  isNewTurn?: boolean
}

interface SuggestionEntry {
  id: string
  response: string
  keyPoints: string[]
  followUp: string
  timestamp: number
}

interface SessionDetail {
  id: string
  job_description: string | null
  resume: string | null
  work_experience: string | null
  transcript: TranscriptEntry[]
  suggestions: SuggestionEntry[]
  duration_seconds: number
  provider_used: string | null
  created_at: string
  ended_at: string | null
}

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { fetchWithAuth } = useAuth()
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'transcript' | 'suggestions' | 'context'>('transcript')

  const sessionId = params.id as string

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetchWithAuth(`/api/sessions/${sessionId}`)
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Session not found')
          }
          throw new Error('Failed to load session')
        }
        const data = await response.json()
        setSession(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session')
      } finally {
        setIsLoading(false)
      }
    }

    if (sessionId) {
      loadSession()
    }
  }, [sessionId, fetchWithAuth])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleDownloadTranscript = async (format: 'text' | 'json') => {
    try {
      const response = await fetchWithAuth(`/api/sessions/${sessionId}/transcript?format=${format}`)
      if (!response.ok) throw new Error('Failed to download transcript')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transcript-${sessionId}.${format === 'json' ? 'json' : 'txt'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">{error || 'Session not found'}</h3>
        <Link
          href="/dashboard/sessions"
          className="text-blue-600 hover:text-blue-700"
        >
          &larr; Back to Sessions
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link
            href="/dashboard/sessions"
            className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block"
          >
            &larr; Back to Sessions
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Session Details</h1>
          <p className="text-slate-600 mt-1">{formatDate(session.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownloadTranscript('text')}
            className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
          >
            Download TXT
          </button>
          <button
            onClick={() => handleDownloadTranscript('json')}
            className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
          >
            Download JSON
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">Duration</p>
          <p className="text-xl font-bold text-slate-900">{formatDuration(session.duration_seconds)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">Transcript Entries</p>
          <p className="text-xl font-bold text-slate-900">{session.transcript?.length || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">AI Suggestions</p>
          <p className="text-xl font-bold text-slate-900">{session.suggestions?.length || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('transcript')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'transcript'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Transcript ({session.transcript?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'suggestions'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Suggestions ({session.suggestions?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('context')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'context'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Context
            </button>
          </nav>
        </div>

        <div className="p-6 max-h-[600px] overflow-y-auto">
          {activeTab === 'transcript' && (
            <div className="space-y-4">
              {session.transcript && session.transcript.length > 0 ? (
                session.transcript.map((entry, index) => (
                  <div
                    key={entry.id || index}
                    className={`${entry.isNewTurn && index > 0 ? 'mt-6 pt-4 border-t border-slate-200' : ''}`}
                  >
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-1 ${
                        entry.speaker === 'user'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {entry.speaker === 'user' ? 'You' : 'Interviewer'}
                    </span>
                    <p className="text-slate-700">{entry.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-8">No transcript available</p>
              )}
            </div>
          )}

          {activeTab === 'suggestions' && (
            <div className="space-y-6">
              {session.suggestions && session.suggestions.length > 0 ? (
                session.suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.id || index}
                    className="bg-slate-50 rounded-lg p-4"
                  >
                    <p className="text-sm text-slate-500 mb-2">Suggestion {index + 1}</p>
                    <p className="text-slate-700 whitespace-pre-wrap">{suggestion.response}</p>
                    {suggestion.keyPoints && suggestion.keyPoints.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-slate-600 mb-1">Key Points:</p>
                        <ul className="list-disc list-inside text-sm text-slate-600">
                          {suggestion.keyPoints.map((point, i) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {suggestion.followUp && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-slate-600 mb-1">Follow-up:</p>
                        <p className="text-sm text-slate-600 italic">{suggestion.followUp}</p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-8">No suggestions available</p>
              )}
            </div>
          )}

          {activeTab === 'context' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-slate-600 mb-2">Job Description</h3>
                <p className="text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-4">
                  {session.job_description || 'No job description provided'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-600 mb-2">Resume</h3>
                <p className="text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-4">
                  {session.resume || 'No resume provided'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-600 mb-2">Work Experience</h3>
                <p className="text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-4">
                  {session.work_experience || 'No work experience provided'}
                </p>
              </div>
              {session.provider_used && (
                <div>
                  <h3 className="text-sm font-medium text-slate-600 mb-2">Provider Used</h3>
                  <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm capitalize">
                    {session.provider_used}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
