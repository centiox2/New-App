import type { ButtonHTMLAttributes } from 'react'

type Variant = 'filled' | 'tonal' | 'outlined' | 'text' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const variantClasses: Record<Variant, string> = {
  filled: 'bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:opacity-90 disabled:opacity-40',
  tonal:
    'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] hover:opacity-90 disabled:opacity-40',
  outlined:
    'border border-[var(--md-outline)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container)] disabled:opacity-40',
  text: 'text-[var(--md-primary)] hover:bg-[var(--md-surface-container)] disabled:opacity-40',
  danger: 'bg-[var(--md-error)] text-[var(--md-on-error)] hover:opacity-90 disabled:opacity-40'
}

export function Button({
  variant = 'filled',
  className = '',
  ...props
}: ButtonProps): React.JSX.Element {
  return (
    <button
      className={`app-no-drag inline-flex flex-shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
}
