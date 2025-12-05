import { Button } from '@pems/ui'
import { Show, createSignal, onMount, type JSX } from 'solid-js'

function MobileNav(props: {
  onLogin: () => void
  extraContent?: JSX.Element
  mounted: boolean
}) {
  const [open, setOpen] = createSignal(false)

  return (
    <div class="md:hidden">
      <button
        class={`p-2 rounded-lg transition-transform duration-250 ${open() ? 'rotate-90' : ''}`}
        onClick={() => setOpen(!open())}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 6h16M4 12h16M4 18h16"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>

      <Show when={open()}>
        <nav
          class={`absolute top-16 left-0 right-0 bg-background/95 p-4 border-b border-border shadow-md transition-all duration-280 ${
            open() ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'
          }`}
        >
          <ul class="flex flex-col gap-3">
            <li>
              <a
                href="#features"
                class="block px-3 py-2 rounded hover:bg-muted"
              >
                Features
              </a>
            </li>
            <li>
              <a
                href="#ui-components"
                class="block px-3 py-2 rounded hover:bg-muted"
              >
                UI Components
              </a>
            </li>
            <li>
              <a href="#pricing" class="block px-3 py-2 rounded hover:bg-muted">
                Pricing
              </a>
            </li>
            <li>
              <a
                href="#testimonials"
                class="block px-3 py-2 rounded hover:bg-muted"
              >
                Testimonials
              </a>
            </li>
            <Show when={props.mounted && props.extraContent}>
              <li>
                <div class="px-3 py-2">{props.extraContent}</div>
              </li>
            </Show>
            <Show when={props.mounted}>
              <li>
                <button
                  onClick={props.onLogin}
                  class="w-full text-left px-3 py-2 rounded bg-primary text-primary-foreground"
                >
                  Login
                </button>
              </li>
            </Show>
          </ul>
        </nav>
      </Show>
    </div>
  )
}

export function Navbar(props: {
  onLogin: () => void
  extraContent?: JSX.Element
}) {
  const [mounted, setMounted] = createSignal(false)

  onMount(() => {
    setMounted(true)
  })

  return (
    <header class="w-full py-4 border-b border-border sticky top-0 backdrop-blur bg-background/70 z-50">
      <div class="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-md">
              P
            </div>
            <h1 class="text-2xl font-black">PEMS</h1>
          </div>
          <nav class="hidden md:flex gap-1">
            <a
              href="#features"
              class="px-4 py-2 rounded-lg hover:bg-muted transition-colors font-medium"
            >
              Features
            </a>
            <a
              href="#ui-components"
              class="px-4 py-2 rounded-lg hover:bg-muted transition-colors font-medium"
            >
              UI Components
            </a>
            <a
              href="#pricing"
              class="px-4 py-2 rounded-lg hover:bg-muted transition-colors font-medium"
            >
              Pricing
            </a>
            <a
              href="#testimonials"
              class="px-4 py-2 rounded-lg hover:bg-muted transition-colors font-medium"
            >
              Testimonials
            </a>
          </nav>
        </div>

        <div class="flex items-center gap-3">
          <div class="hidden md:flex items-center gap-3">
            {/* Only render extra content after hydration */}
            <Show when={mounted() && props.extraContent}>
              <div class="flex items-center">{props.extraContent}</div>
            </Show>
            {/* Only render login button after hydration */}
            <Show
              when={mounted()}
              fallback={
                <div class="h-10 w-20 bg-primary/20 rounded-lg animate-pulse" />
              }
            >
              <Button
                onClick={props.onLogin}
                class="rounded-lg px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-semibold shadow-md hover:shadow-lg"
              >
                Login
              </Button>
            </Show>
          </div>

          <div class="md:hidden">
            <MobileNav
              onLogin={props.onLogin}
              extraContent={props.extraContent}
              mounted={mounted()}
            />
          </div>
        </div>
      </div>
    </header>
  )
}
