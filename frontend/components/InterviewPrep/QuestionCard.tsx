'use client'

import { useState } from 'react'
import type { QuestionAnswerPair } from '@/types'

interface QuestionCardProps {
  pair: QuestionAnswerPair
  index: number
  onUpdate: (index: number, updates: Partial<QuestionAnswerPair>) => void
}

const tierColors = {
  must_ask: 'bg-red-500/20 text-red-400',
  high_probability: 'bg-amber-500/20 text-amber-400',
  stretch: 'bg-blue-500/20 text-blue-400',
}

const tierLabels = {
  must_ask: 'Must Ask',
  high_probability: 'High Probability',
  stretch: 'Stretch',
}

export function QuestionCard({ pair, index, onUpdate }: QuestionCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState(pair.answer_data)

  // Detect tier from question_id prefix or default
  const tier = (pair as any).tier || 'high_probability'

  const handleSaveEdit = () => {
    onUpdate(index, {
      answer_data: editData,
      is_edited: true,
    })
    setIsEditing(false)
  }

  const handleApprove = () => {
    onUpdate(index, { is_approved: !pair.is_approved })
  }

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all ${
        pair.is_approved
          ? 'border-accent-green/50 bg-accent-green/5'
          : 'border-border bg-bg-tertiary'
      }`}
    >
      {/* Question Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs rounded-full ${tierColors[tier as keyof typeof tierColors] || tierColors.high_probability}`}>
              {tierLabels[tier as keyof typeof tierLabels] || 'Question'}
            </span>
            {pair.is_edited && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-400">
                Edited
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-text-primary">{pair.question_text}</p>
        </div>
        <button
          onClick={handleApprove}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            pair.is_approved
              ? 'bg-accent-green text-white'
              : 'bg-bg-secondary border border-border text-text-secondary hover:border-accent-green hover:text-accent-green'
          }`}
        >
          {pair.is_approved ? '\u2713 Approved' : 'Approve'}
        </button>
      </div>

      {/* Answer Content */}
      <div className="px-4 py-3 space-y-3">
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-secondary">Core Message</label>
              <textarea
                value={editData.core_message}
                onChange={(e) => setEditData({ ...editData, core_message: e.target.value })}
                rows={2}
                className="w-full mt-1 px-3 py-2 bg-bg-secondary border border-border rounded text-sm text-text-primary resize-y focus:outline-none focus:border-accent-blue"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary">Example Reference</label>
              <textarea
                value={editData.example_reference}
                onChange={(e) => setEditData({ ...editData, example_reference: e.target.value })}
                rows={2}
                className="w-full mt-1 px-3 py-2 bg-bg-secondary border border-border rounded text-sm text-text-primary resize-y focus:outline-none focus:border-accent-blue"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary">Impact Metrics</label>
              <input
                value={editData.impact_metrics}
                onChange={(e) => setEditData({ ...editData, impact_metrics: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-bg-secondary border border-border rounded text-sm text-text-primary focus:outline-none focus:border-accent-blue"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary">Talking Points (one per line)</label>
              <textarea
                value={editData.talking_points.join('\n')}
                onChange={(e) => setEditData({ ...editData, talking_points: e.target.value.split('\n').filter(Boolean) })}
                rows={3}
                className="w-full mt-1 px-3 py-2 bg-bg-secondary border border-border rounded text-sm text-text-primary resize-y focus:outline-none focus:border-accent-blue"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 bg-accent-blue text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => { setIsEditing(false); setEditData(pair.answer_data) }}
                className="px-4 py-1.5 bg-bg-secondary border border-border text-text-secondary rounded text-xs hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {pair.answer_data.core_message && (
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Core Message</p>
                <p className="text-sm text-text-primary">{pair.answer_data.core_message}</p>
              </div>
            )}
            {pair.answer_data.example_reference && (
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Example</p>
                <p className="text-sm text-text-primary">{pair.answer_data.example_reference}</p>
              </div>
            )}
            {pair.answer_data.impact_metrics && pair.answer_data.impact_metrics !== 'N/A' && (
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Metrics</p>
                <p className="text-sm text-accent-green">{pair.answer_data.impact_metrics}</p>
              </div>
            )}
            {pair.answer_data.talking_points?.length > 0 && (
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Talking Points</p>
                <ul className="space-y-1">
                  {pair.answer_data.talking_points.map((point, i) => (
                    <li key={i} className="text-sm text-text-primary flex gap-2">
                      <span className="text-accent-blue shrink-0">&#8226;</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-text-secondary hover:text-accent-blue transition-colors"
            >
              Edit answer
            </button>
          </>
        )}
      </div>
    </div>
  )
}
