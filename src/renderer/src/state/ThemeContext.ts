import { createContext } from 'react'

export type ThemeSetting = 'light' | 'dark' | 'system'

export interface ThemeContextValue {
  theme: ThemeSetting
  setTheme: (t: ThemeSetting) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
