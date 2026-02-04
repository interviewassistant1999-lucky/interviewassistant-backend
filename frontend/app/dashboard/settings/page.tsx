'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface APIKeyInfo {
  provider: string
  masked_key: string
  created_at: string
  updated_at: string
}

const PROVIDER_INFO = {
  groq: {
    name: 'Groq',
    description: 'Ultra-fast inference with Whisper and Llama 3.3',
    getKeyUrl: 'https://console.groq.com/keys',
    badge: 'Recommended - FREE',
  },
  openai: {
    name: 'OpenAI',
    description: 'GPT-4 and Whisper API',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    badge: 'Paid',
  },
  gemini: {
    name: 'Gemini',
    description: 'Google AI multimodal models',
    getKeyUrl: 'https://aistudio.google.com/apikey',
    badge: 'Free tier available',
  },
}

export default function SettingsPage() {
  const { fetchWithAuth } = useAuth()
  const [apiKeys, setApiKeys] = useState<APIKeyInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingProvider, setEditingProvider] = useState<string | null>(null)
  const [newKey, setNewKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const loadApiKeys = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/settings/api-keys')
      if (!response.ok) {
        if (response.status === 503) {
          setError('API key storage is not configured. Please contact support.')
          return
        }
        throw new Error('Failed to load API keys')
      }
      const data = await response.json()
      setApiKeys(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys')
    } finally {
      setIsLoading(false)
    }
  }, [fetchWithAuth])

  useEffect(() => {
    loadApiKeys()
  }, [loadApiKeys])

  const handleSaveKey = async (provider: string) => {
    if (!newKey.trim()) return

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetchWithAuth(`/api/settings/api-keys/${provider}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: newKey }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to save API key')
      }

      // Optimistically update local state with masked key
      const maskedKey = newKey.slice(0, 4) + '****' + newKey.slice(-4)
      const now = new Date().toISOString()
      setApiKeys((prev) => {
        const existing = prev.find((k) => k.provider === provider)
        if (existing) {
          return prev.map((k) =>
            k.provider === provider ? { ...k, masked_key: maskedKey, updated_at: now } : k
          )
        }
        return [...prev, { provider, masked_key: maskedKey, created_at: now, updated_at: now }]
      })

      setSuccess(`${PROVIDER_INFO[provider as keyof typeof PROVIDER_INFO]?.name || provider} API key saved successfully`)
      setEditingProvider(null)
      setNewKey('')

      // Also reload from server to get accurate masked key format
      loadApiKeys()

      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteKey = async (provider: string) => {
    try {
      const response = await fetchWithAuth(`/api/settings/api-keys/${provider}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete API key')

      setApiKeys(apiKeys.filter((k) => k.provider !== provider))
      setSuccess('API key deleted')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API key')
    }
  }

  const getKeyForProvider = (provider: string) => {
    return apiKeys.find((k) => k.provider === provider)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">Manage your API keys and preferences</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="float-right text-red-500">
            &times;
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">API Keys</h2>
          <p className="text-sm text-slate-600 mt-1">
            Store your LLM provider API keys securely. Keys are encrypted and never shared.
          </p>
        </div>

        <div className="divide-y divide-slate-200">
          {Object.entries(PROVIDER_INFO).map(([provider, info]) => {
            const existingKey = getKeyForProvider(provider)
            const isEditing = editingProvider === provider

            return (
              <div key={provider} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-900">{info.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        info.badge.includes('FREE') || info.badge.includes('Recommended')
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {info.badge}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{info.description}</p>
                    <a
                      href={info.getKeyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-block"
                    >
                      Get API key &rarr;
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    {existingKey ? (
                      <>
                        <span className="text-sm font-mono text-slate-500">
                          {existingKey.masked_key}
                        </span>
                        <button
                          onClick={() => {
                            setEditingProvider(provider)
                            setNewKey('')
                          }}
                          className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          Update
                        </button>
                        <button
                          onClick={() => handleDeleteKey(provider)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingProvider(provider)
                          setNewKey('')
                        }}
                        className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                      >
                        Add Key
                      </button>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-4 flex items-center gap-3">
                    <input
                      type="password"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      placeholder="Paste your API key"
                      className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900"
                    />
                    <button
                      onClick={() => handleSaveKey(provider)}
                      disabled={isSaving || !newKey.trim()}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
                    >
                      {isSaving ? 'Validating...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingProvider(null)
                        setNewKey('')
                      }}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
