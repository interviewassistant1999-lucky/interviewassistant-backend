'use client'

import { useState } from 'react'

interface ManualQAEntryProps {
  onAdd: (question: string, answer: string) => void
}

export function ManualQAEntry({ onAdd }: ManualQAEntryProps) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')

  const handleSubmit = () => {
    if (!question.trim() || !answer.trim()) return
    onAdd(question.trim(), answer.trim())
    setQuestion('')
    setAnswer('')
  }

  const isValid = question.trim().length > 0 && answer.trim().length > 0

  return (
    <div className="space-y-3 p-4 bg-bg-tertiary border border-border rounded-lg">
      <div>
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          Question
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g., Tell me about a time you led a cross-functional team..."
          rows={2}
          className="w-full mt-1 px-3 py-2 bg-bg-secondary border border-border rounded text-sm text-text-primary placeholder-text-secondary/50 resize-y focus:outline-none focus:border-accent-blue"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          Your Answer / Key Points
        </label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="e.g., At my previous company, I led a team of 8 engineers and 3 PMs to deliver..."
          rows={4}
          className="w-full mt-1 px-3 py-2 bg-bg-secondary border border-border rounded text-sm text-text-primary placeholder-text-secondary/50 resize-y focus:outline-none focus:border-accent-blue"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={!isValid}
        className="w-full py-2.5 px-4 bg-accent-blue hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium text-sm transition-colors"
      >
        Add to Prep List
      </button>
    </div>
  )
}
