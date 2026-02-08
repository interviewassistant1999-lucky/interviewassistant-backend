'use client'

import { useSessionStore } from '@/stores/sessionStore'
import type { RoleType } from '@/types'

interface RoleOption {
  value: RoleType
  label: string
}

const options: RoleOption[] = [
  { value: 'software_engineer', label: 'Software Engineer' },
  { value: 'senior_software_engineer', label: 'Senior Software Engineer' },
  { value: 'staff_engineer', label: 'Staff Engineer' },
  { value: 'product_manager', label: 'Product Manager' },
  { value: 'technical_program_manager', label: 'Technical Program Manager' },
  { value: 'data_scientist', label: 'Data Scientist' },
  { value: 'data_engineer', label: 'Data Engineer' },
  { value: 'machine_learning_engineer', label: 'Machine Learning Engineer' },
  { value: 'engineering_manager', label: 'Engineering Manager' },
  { value: 'other', label: 'Other' },
]

export function RoleTypeSelector() {
  const { roleType, setRoleType } = useSessionStore()

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text-primary">Role Type</label>
      <select
        value={roleType}
        onChange={(e) => setRoleType(e.target.value as RoleType | '')}
        className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-blue text-sm appearance-none cursor-pointer"
      >
        <option value="">Select a role...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
