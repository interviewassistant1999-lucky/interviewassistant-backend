'use client'

interface DisclaimerProps {
  onAccept: () => void
}

export function Disclaimer({ onAccept }: DisclaimerProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="max-w-lg w-full bg-bg-secondary rounded-xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Interview Assistant - Usage Guidelines
        </h2>

        <p className="text-text-secondary mb-6">
          This tool is designed to help you perform your best during interviews
          by surfacing relevant information from{' '}
          <span className="text-text-primary font-medium">
            YOUR OWN experience
          </span>
          .
        </p>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-accent-green">
            Recommended Use:
          </h3>
          <ul className="space-y-2 text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-accent-green">✓</span>
              Interview practice and preparation
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-green">✓</span>
              Remembering key achievements and metrics
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-green">✓</span>
              Structuring your responses
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-green">✓</span>
              Reducing interview anxiety
            </li>
          </ul>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3 text-accent-yellow">
            Your Responsibility:
          </h3>
          <ul className="space-y-2 text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-accent-yellow">⚠</span>
              You are responsible for how you use this tool
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-yellow">⚠</span>
              Be authentic - the AI helps you remember, not fabricate
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-yellow">⚠</span>
              Consider disclosure if your company/interviewer has policies
            </li>
          </ul>
        </div>

        <p className="text-sm text-text-secondary mb-6 text-center">
          By continuing, you acknowledge these guidelines.
        </p>

        <button
          onClick={onAccept}
          className="w-full py-4 px-6 bg-accent-blue hover:bg-blue-600 rounded-lg font-semibold transition-colors text-lg"
        >
          I Understand - Continue
        </button>
      </div>
    </div>
  )
}
