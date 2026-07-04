"use client"
import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { Theme, ThemeTokens, themes } from "@/styles/theme"

const THEME_KEY = "cpdojo-theme"

type ThemeContextValue = {
  theme: Theme
  tokens: ThemeTokens
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>("light")

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === "light" || stored === "dark") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(stored)
    }
  }, [])

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light"
      localStorage.setItem(THEME_KEY, next)
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, tokens: themes[theme], toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}

export default useTheme