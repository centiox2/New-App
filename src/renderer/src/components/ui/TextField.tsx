import type { InputHTMLAttributes } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function TextField({
  label,
  error,
  id,
  className = '',
  ...props
}: TextFieldProps): React.JSX.Element {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-[var(--md-on-surface-variant)]">
        {label}
      </label>
      <input
        id={inputId}
        className={`app-no-drag rounded-lg border px-3 py-2 text-sm text-[var(--md-on-surface)] outline-none transition-colors focus:border-[var(--md-primary)] ${
          error ? 'border-[var(--md-error)]' : 'border-[var(--md-outline-variant)]'
        } bg-[var(--md-surface)] ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-[var(--md-error)]">{error}</span>}
    </div>
  )
}
