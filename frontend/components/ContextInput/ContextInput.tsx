'use client'

import { useSessionStore } from '@/stores/sessionStore'
import { TextAreaField } from './TextAreaField'

export function ContextInput() {
  const { context, setContext } = useSessionStore()

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Interview Context</h2>
      <p className="text-text-secondary text-sm">
        Provide context to help the AI give you relevant suggestions during the
        interview.
      </p>

      <div className="space-y-4">
        <TextAreaField
          label="Job Description"
          placeholder="Paste the job description here. Include key requirements, responsibilities, and qualifications..."
          value={context.jobDescription}
          onChange={(value) => setContext({ jobDescription: value })}
        />

        <TextAreaField
          label="Your Resume"
          placeholder="Paste your resume or key highlights. Include your experience, skills, and achievements..."
          value={context.resume}
          onChange={(value) => setContext({ resume: value })}
        />

        <TextAreaField
          label="Detailed Work Experience"
          placeholder="Add specific details about projects, metrics, and accomplishments you want to highlight..."
          value={context.workExperience}
          onChange={(value) => setContext({ workExperience: value })}
        />
      </div>
    </div>
  )
}
