import { useEffect, useState, type ReactNode } from 'react'
import { ThemeContext, type ThemeSetting } from './ThemeContext'

const STORAGE_KEY = 'gsr-theme-preference'

function applyResolvedTheme(theme: ThemeSetting): void {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', isDark)
}

export function ThemeProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [theme, setThemeState] = useState<ThemeSetting>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as ThemeSetting) ?? 'system'
    } catch {
      return 'system'
    }
  })

  useEffect(() => {
    applyResolvedTheme(theme)
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (): void => {
      if (theme === 'system') applyResolvedTheme('system')
    }
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [theme])

  const setTheme = (t: ThemeSetting): void => {
    setThemeState(t)
    try {
      localStorage.setItem(STORAGE_KEY, t)
    } catch {
      /* ignore — theme just won't persist across launches */
    }
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
