import React, { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle() {
  const getInitialTheme = () => {
    const savedTheme = localStorage.getItem('theme')
    console.log('Saved theme:', savedTheme)
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    console.log('Prefers dark:', prefersDark)
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme
    }
    return prefersDark ? 'dark' : 'light'
  }

  const [theme, setTheme] = useState(getInitialTheme)
  const isDark = theme === 'dark'

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="transition-all duration-300 hover:scale-110"
      aria-label="Toggle theme"
      style={{ cursor: 'pointer' }}
    >
      {isDark ? (
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
      )}
    </Button>
  )
}
