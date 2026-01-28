'use client'

interface TextAreaFieldProps {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}

export function TextAreaField({
  label,
  placeholder,
  value,
  onChange,
}: TextAreaFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-text-secondary">{label}</label>
      <textarea
        className="w-full h-32 p-3 bg-bg-tertiary border border-border rounded-lg
                   text-text-primary placeholder-text-secondary/50 resize-none
                   focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent
                   transition-all"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
