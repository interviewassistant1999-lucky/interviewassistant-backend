'use client'

import { useState, useCallback } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { useAuth } from '@/hooks/useAuth'
import { QuestionCard } from './QuestionCard'
import { ManualQAEntry } from './ManualQAEntry'
import type { InterviewQuestion, QuestionAnswerPair } from '@/types'

export function PrepReview() {
  const {
    companyName, roleType, roundType, resumeParsedText, context,
    questions, qaPairs, prepLoading, prepError, provider,
    setQuestions, setQaPairs, setPrepLoading, setPrepError, setPromptInjection,
  } = useSessionStore()
  const { fetchWithAuth } = useAuth()
  const [step, setStep] = useState<'fetch' | 'generate' | 'review'>(
    qaPairs.length > 0 ? 'review' : questions.length > 0 ? 'generate' : 'fetch'
  )
  const [showManualEntry, setShowManualEntry] = useState(false)

  const handleFetchQuestions = useCallback(async () => {
    setPrepLoading(true)
    setPrepError(null)

    try {
      const response = await fetchWithAuth('/api/interview-prep/fetch-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          role_type: roleType,
          jd_text: context.jobDescription,
          round_type: roundType,
          limit: 6,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch questions')
      }

      const data = await response.json()
      const all: InterviewQuestion[] = [
        ...(data.must_ask || []),
        ...(data.high_probability || []),
        ...(data.stretch || []),
      ]
      setQuestions(all)

      if (all.length > 0) {
        setStep('generate')
      } else {
        setPrepError('No questions found. You can add questions manually or proceed without prep.')
      }
    } catch (err: any) {
      setPrepError(err.message || 'Failed to fetch questions')
    } finally {
      setPrepLoading(false)
    }
  }, [companyName, roleType, roundType, context.jobDescription, fetchWithAuth, setQuestions, setPrepLoading, setPrepError])

  const handleGenerateAnswers = useCallback(async () => {
    setPrepLoading(true)
    setPrepError(null)

    try {
      const response = await fetchWithAuth('/api/interview-prep/generate-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: questions.map(q => ({
            id: q.id,
            question_text: q.question_text,
          })),
          resume_text: resumeParsedText || context.resume,
          jd_text: context.jobDescription,
          work_experience: context.workExperience,
          company_name: companyName,
          role_type: roleType,
          round_type: roundType,
          provider: provider === 'adaptive' ? 'groq' : provider,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Failed to generate answers')
      }

      const data = await response.json()
      const pairs: QuestionAnswerPair[] = (data.answers || []).map((a: any, i: number) => ({
        question_id: a.question_id || questions[i]?.id || '',
        question_text: a.question_text || questions[i]?.question_text || '',
        answer_data: a.answer_data || { core_message: '', example_reference: '', impact_metrics: '', talking_points: [] },
        is_approved: false,
        is_edited: false,
        tier: questions[i]?.tier || 'high_probability',
      }))
      setQaPairs(pairs)
      setStep('review')
    } catch (err: any) {
      setPrepError(err.message || 'Failed to generate answers')
    } finally {
      setPrepLoading(false)
    }
  }, [questions, resumeParsedText, context, companyName, roleType, roundType, provider, fetchWithAuth, setQaPairs, setPrepLoading, setPrepError])

  const handleApproveAll = useCallback(async () => {
    const approved = qaPairs.filter(p => p.is_approved)
    if (approved.length === 0) {
      setPrepError('Please approve at least one answer to proceed.')
      return
    }

    setPrepLoading(true)
    setPrepError(null)

    try {
      const response = await fetchWithAuth('/api/interview-prep/approve-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: approved.map(p => ({
            question_id: p.question_id,
            question_text: p.question_text,
            answer_data: p.answer_data,
          })),
          company_name: companyName,
          round_type: roundType,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to approve answers')
      }

      const data = await response.json()
      setPromptInjection(data.prompt_injection || '')
    } catch (err: any) {
      setPrepError(err.message || 'Failed to approve answers')
    } finally {
      setPrepLoading(false)
    }
  }, [qaPairs, companyName, roundType, fetchWithAuth, setPromptInjection, setPrepLoading, setPrepError])

  const handleAddManualQA = useCallback((question: string, answer: string) => {
    const newPair: QuestionAnswerPair = {
      question_id: `manual_${Date.now()}`,
      question_text: question,
      answer_data: {
        core_message: answer,
        example_reference: '',
        impact_metrics: '',
        talking_points: [],
      },
      is_approved: true, // Auto-approve manual entries
      is_edited: false,
    }
    setQaPairs([...qaPairs, newPair])

    // If we're on fetch/generate step, jump to review since we now have content
    if (step !== 'review') {
      setStep('review')
    }
  }, [qaPairs, step, setQaPairs])

  const handleSkipToManual = useCallback(() => {
    setStep('review')
    setShowManualEntry(true)
  }, [])

  const approvedCount = qaPairs.filter(p => p.is_approved).length

  const handleBulkApprove = () => {
    const allApproved = qaPairs.every(p => p.is_approved)
    const updated = qaPairs.map(p => ({ ...p, is_approved: !allApproved }))
    setQaPairs(updated)
  }

  return (
    <div className="space-y-4">
      {/* Header with context summary */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Interview Preparation</h3>
          <p className="text-text-secondary text-sm">
            {companyName && <span className="text-accent-blue">{companyName}</span>}
            {companyName && roleType && ' - '}
            {roleType && <span className="capitalize">{roleType.replace(/_/g, ' ')}</span>}
            {(companyName || roleType) && roundType && ' - '}
            {roundType && <span className="capitalize">{roundType.replace(/_/g, ' ')}</span>}
          </p>
        </div>
      </div>

      {/* Step: Fetch Questions */}
      {step === 'fetch' && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Fetch likely interview questions based on your target company and round type, or add your own manually.
          </p>
          <button
            onClick={handleFetchQuestions}
            disabled={prepLoading}
            className="w-full py-3 px-4 bg-accent-blue hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            {prepLoading ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                Fetching Questions...
              </>
            ) : (
              'Fetch Likely Questions'
            )}
          </button>
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-text-secondary">or</span>
            <div className="flex-1 border-t border-border" />
          </div>
          <button
            onClick={handleSkipToManual}
            className="w-full py-3 px-4 bg-bg-tertiary border border-border hover:border-accent-blue rounded-lg font-medium text-sm transition-colors"
          >
            Add Questions & Answers Manually
          </button>
        </div>
      )}

      {/* Step: Generate Answers */}
      {step === 'generate' && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Found {questions.length} likely questions. Generate AI-powered answers grounded in your resume.
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {questions.map((q, i) => (
              <div key={q.id || i} className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm">
                <span className={`inline-block px-1.5 py-0.5 text-xs rounded mr-2 ${
                  q.tier === 'must_ask' ? 'bg-red-500/20 text-red-400' :
                  q.tier === 'high_probability' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {q.tier === 'must_ask' ? 'Must Ask' : q.tier === 'high_probability' ? 'High Prob' : 'Stretch'}
                </span>
                {q.question_text}
              </div>
            ))}
          </div>
          <button
            onClick={handleGenerateAnswers}
            disabled={prepLoading}
            className="w-full py-3 px-4 bg-accent-green hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            {prepLoading ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                Generating Answers...
              </>
            ) : (
              `Generate Answers for ${questions.length} Questions`
            )}
          </button>
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-text-secondary">or</span>
            <div className="flex-1 border-t border-border" />
          </div>
          <button
            onClick={handleSkipToManual}
            className="w-full py-3 px-4 bg-bg-tertiary border border-border hover:border-accent-blue rounded-lg font-medium text-sm transition-colors"
          >
            Skip & Add Answers Manually
          </button>
        </div>
      )}

      {/* Step: Review & Approve */}
      {step === 'review' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">
              Review, edit, and approve answers. Approved answers will be injected into the AI prompt.
            </p>
            {qaPairs.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary">{approvedCount}/{qaPairs.length} approved</span>
                <button
                  onClick={handleBulkApprove}
                  className="px-3 py-1 text-xs bg-bg-tertiary border border-border rounded hover:border-accent-blue transition-colors"
                >
                  {qaPairs.every(p => p.is_approved) ? 'Unapprove All' : 'Approve All'}
                </button>
              </div>
            )}
          </div>

          {qaPairs.length > 0 && (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {qaPairs.map((pair, i) => (
                <QuestionCard
                  key={pair.question_id || i}
                  pair={pair}
                  index={i}
                  onUpdate={(idx, updates) => {
                    const updated = [...qaPairs]
                    updated[idx] = { ...updated[idx], ...updates }
                    setQaPairs(updated)
                  }}
                  onDelete={(idx) => {
                    const updated = qaPairs.filter((_, i) => i !== idx)
                    setQaPairs(updated)
                  }}
                />
              ))}
            </div>
          )}

          {qaPairs.length === 0 && !showManualEntry && (
            <div className="py-8 text-center text-text-secondary text-sm">
              No questions yet. Add your own questions and answers below.
            </div>
          )}

          {/* Manual Q&A Entry */}
          <div className="border-t border-border pt-4">
            <button
              onClick={() => setShowManualEntry(!showManualEntry)}
              className="flex items-center gap-2 text-sm font-medium text-accent-blue hover:text-blue-400 transition-colors"
            >
              <span className="text-lg">{showManualEntry ? '-' : '+'}</span>
              {showManualEntry ? 'Hide Manual Entry' : 'Add Question & Answer Manually'}
            </button>

            {showManualEntry && (
              <div className="mt-3">
                <ManualQAEntry onAdd={handleAddManualQA} />
              </div>
            )}
          </div>

          {qaPairs.length > 0 && (
            <button
              onClick={handleApproveAll}
              disabled={prepLoading || approvedCount === 0}
              className="w-full py-3 px-4 bg-accent-green hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              {prepLoading ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                `Save ${approvedCount} Approved Answer${approvedCount !== 1 ? 's' : ''} to Prep`
              )}
            </button>
          )}
        </div>
      )}

      {/* Error display */}
      {prepError && (
        <div className="p-3 bg-accent-red/10 border border-accent-red/30 rounded-lg text-accent-red text-sm">
          {prepError}
        </div>
      )}
    </div>
  )
}
