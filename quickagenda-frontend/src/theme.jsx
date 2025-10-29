import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'

const ThemeModeContext = createContext({ mode: 'light', toggle: () => {} })

export function useThemeMode() {
  return useContext(ThemeModeContext)
}

export function ThemeModeProvider({ children }) {
  const getInitial = () => {
    try {
      const saved = localStorage.getItem('qa_theme')
      if (saved === 'light' || saved === 'dark') return saved
    } catch {}
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
    return 'light'
  }
  const [mode, setMode] = useState(getInitial)

  useEffect(() => {
    try { localStorage.setItem('qa_theme', mode) } catch {}
  }, [mode])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      try {
        const saved = localStorage.getItem('qa_theme')
        if (saved === 'light' || saved === 'dark') return
      } catch {}
      setMode(mq.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode])
  const value = useMemo(() => ({ mode, toggle: () => setMode(m => (m === 'light' ? 'dark' : 'light')) }), [mode])

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}
