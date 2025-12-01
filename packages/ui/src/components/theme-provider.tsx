import {
  createContext,
  createSignal,
  useContext,
  onMount,
  createMemo,
} from 'solid-js'
import type { ParentComponent, Accessor } from 'solid-js'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  defaultTheme?: Theme
  storageKey?: string
  children?: unknown
}

type ThemeProviderState = {
  theme: Accessor<Theme>
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: () => 'system',
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export const ThemeProvider: ParentComponent<ThemeProviderProps> = (props) => {
  const [theme, setTheme] = createSignal<Theme>(
    props.defaultTheme ?? initialState.theme(),
  )

  onMount(() => {
    const stored = localStorage.getItem(props.storageKey ?? 'vite-ui-theme')
    if (stored) {
      setTheme(stored as Theme)
    }
  })

  const setValue = (value: Theme) => {
    localStorage.setItem(props.storageKey ?? 'vite-ui-theme', value)
    setTheme(value)

    // Apply theme to document
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (value === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light'

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(value)
  }

  const themeValue = createMemo(() => theme())

  const value = {
    theme: themeValue,
    setTheme: setValue,
  }

  return (
    <ThemeProviderContext.Provider value={value}>
      {props.children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')

  return context
}
