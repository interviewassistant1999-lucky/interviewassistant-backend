'use client'

interface AudioLevelMeterProps {
  label: string
  level: number // 0-1
  active: boolean
}

export function AudioLevelMeter({ label, level, active }: AudioLevelMeterProps) {
  const percentage = Math.min(100, Math.max(0, level * 100))

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2.5 h-2.5 rounded-full ${
          active ? 'bg-accent-green' : 'bg-text-secondary'
        }`}
      />
      <span className="text-sm text-text-secondary w-14">{label}:</span>
      <div className="w-20 h-2 bg-bg-tertiary rounded-full overflow-hidden">
        <div
          className="h-full bg-accent-green transition-all duration-75"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
