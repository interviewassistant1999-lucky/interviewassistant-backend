'use client'

interface StepWizardProps {
  currentStep: number
  totalSteps: number
  onBack?: () => void
  showBack?: boolean
}

export function StepWizard({ currentStep, totalSteps, onBack, showBack = true }: StepWizardProps) {
  return (
    <div className="flex items-center gap-4 mb-6">
      {showBack && currentStep > 1 && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors text-sm"
        >
          <span>&#8592;</span>
          Back
        </button>
      )}
      <div className="flex items-center gap-2 flex-1">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1
          const isActive = step === currentStep
          const isCompleted = step < currentStep
          return (
            <div key={step} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
                  ${isActive ? 'bg-accent-blue text-white' : ''}
                  ${isCompleted ? 'bg-accent-green text-white' : ''}
                  ${!isActive && !isCompleted ? 'bg-bg-tertiary text-text-secondary border border-border' : ''}
                `}
              >
                {isCompleted ? '\u2713' : step}
              </div>
              <span className={`text-sm ${isActive ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                {step === 1 ? 'Context' : 'Review & Prepare'}
              </span>
              {step < totalSteps && (
                <div className={`flex-1 h-px ${isCompleted ? 'bg-accent-green' : 'bg-border'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
