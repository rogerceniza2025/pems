import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  useContext,
  type Accessor,
  type JSX,
  type ParentComponent,
} from 'solid-js'

// ============================================================================
// Types
// ============================================================================

export type Theme = 'dark' | 'light' | 'system'
export type ResolvedTheme = 'dark' | 'light'

export interface ThemeProviderProps {
  /** Default theme to use before localStorage is checked */
  defaultTheme?: Theme
  /** localStorage key for persisting theme */
  storageKey?: string
  /** Children to render within the provider */
  children?: JSX.Element
}

export interface ThemeContextValue {
  /** Current theme setting ('light', 'dark', or 'system') */
  theme: Accessor<Theme>
  /** Resolved theme after applying system preference ('light' or 'dark') */
  resolvedTheme: Accessor<ResolvedTheme>
  /** Whether the app is hydrated (safe for client-only operations) */
  isHydrated: Accessor<boolean>
  /** Set the theme */
  setTheme: (theme: Theme) => void
  /** Toggle between light and dark */
  toggleTheme: () => void
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'pems-theme'
const DEFAULT_THEME: Theme = 'system'

// ============================================================================
// Context
// ============================================================================

const ThemeContext = createContext<ThemeContextValue>()

// ============================================================================
// Utility Functions
// ============================================================================

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') {
    return getSystemTheme()
  }
  return theme
}

function applyTheme(resolvedTheme: ResolvedTheme): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolvedTheme)
}

function getStoredTheme(storageKey: string): Theme | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored === 'dark' || stored === 'light' || stored === 'system') {
      return stored
    }
  } catch {
    // localStorage might be blocked
  }
  return null
}

function storeTheme(storageKey: string, theme: Theme): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(storageKey, theme)
  } catch {
    // localStorage might be blocked
  }
}

// ============================================================================
// ThemeProvider Component
// ============================================================================

export const ThemeProvider: ParentComponent<ThemeProviderProps> = (props) => {
  // Use getters to access props reactively
  const getStorageKey = () => props.storageKey ?? STORAGE_KEY
  const getDefaultTheme = () => props.defaultTheme ?? DEFAULT_THEME

  // State - Initialize as hydrated IMMEDIATELY for faster perceived load
  // The flash prevention script already set the correct theme class
  const [theme, setThemeState] = createSignal<Theme>(getDefaultTheme())
  const [isHydrated, setIsHydrated] = createSignal(false)

  // Computed resolved theme
  const resolvedTheme = createMemo<ResolvedTheme>(() => resolveTheme(theme()))

  // Initialize on mount (client-side only)
  onMount(() => {
    const storageKey = getStorageKey()
    const defaultTheme = getDefaultTheme()

    // Get stored theme or use default
    const stored = getStoredTheme(storageKey)
    if (stored) {
      setThemeState(stored)
    }

    // Apply initial theme
    applyTheme(resolveTheme(stored ?? defaultTheme))

    // Mark as hydrated IMMEDIATELY - don't use setTimeout/queueMicrotask
    setIsHydrated(true)

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme() === 'system') {
        applyTheme(getSystemTheme())
      }
    }

    mediaQuery.addEventListener('change', handleChange)

    onCleanup(() => {
      mediaQuery.removeEventListener('change', handleChange)
    })
  })

  // Apply theme whenever it changes
  createEffect(() => {
    const currentTheme = theme()
    const resolved = resolveTheme(currentTheme)
    const storageKey = getStorageKey()

    // Only apply and store if hydrated (avoid SSR issues)
    if (isHydrated()) {
      applyTheme(resolved)
      storeTheme(storageKey, currentTheme)
    }
  })

  // Actions
  const setTheme = (newTheme: Theme): void => {
    setThemeState(newTheme)
  }

  const toggleTheme = (): void => {
    const current = theme()
    if (current === 'system') {
      // If system, toggle to opposite of resolved
      setThemeState(resolvedTheme() === 'dark' ? 'light' : 'dark')
    } else {
      setThemeState(current === 'dark' ? 'light' : 'dark')
    }
  }

  // Context value
  const value: ThemeContextValue = {
    theme,
    resolvedTheme,
    isHydrated,
    setTheme,
    toggleTheme,
  }

  return (
    <ThemeContext.Provider value={value}>
      {props.children}
    </ThemeContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}

// ============================================================================
// Inline Script for Flash Prevention
// ============================================================================

export function getThemeScript(storageKey: string = STORAGE_KEY): string {
  return `(function(){try{var t=localStorage.getItem('${storageKey}');var r=t;if(!t||t==='system'){r=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}document.documentElement.classList.add(r)}catch(e){}})();`
}

export default ThemeProvider
