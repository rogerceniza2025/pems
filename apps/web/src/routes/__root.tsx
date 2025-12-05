/// <reference types="vite/client" />
import { ThemeProvider, getThemeScript } from '@pems/ui'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/solid-router'
import * as Solid from 'solid-js'
import { HydrationScript } from 'solid-js/web'
import { PermissionProvider } from '../contexts/PermissionContext'
import indexCss from '../index.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'PEMS - Payment & Expense Management System',
      },
      {
        name: 'description',
        content: 'Professional payment and expense management system',
      },
    ],
    links: [
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png',
      },
      { rel: 'manifest', href: '/site.webmanifest' },
      { rel: 'icon', href: '/favicon.ico' },
      { rel: 'stylesheet', href: indexCss },
    ],
    scripts: [
      // Inline script to prevent flash of incorrect theme
      {
        children: getThemeScript(),
      },
    ],
  }),
  errorComponent: ErrorComponent,
  notFoundComponent: NotFoundComponent,
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <ThemeProvider defaultTheme="system">
        <PermissionProvider>
          <div class="min-h-screen bg-background text-foreground">
            <Outlet />
          </div>
        </PermissionProvider>
      </ThemeProvider>
    </RootDocument>
  )
}

function ErrorComponent(props: { error: Error }) {
  return (
    <RootDocument>
      <div class="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
        <div class="text-center max-w-md">
          <h1 class="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            Something went wrong:
          </p>
          <pre class="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm overflow-auto">
            {props.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    </RootDocument>
  )
}

function NotFoundComponent() {
  return (
    <RootDocument>
      <div class="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
        <div class="text-center max-w-md">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            404 - Page Not Found
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mb-8">
            The page you're looking for doesn't exist.
          </p>
          <a
            href="/"
            class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    </RootDocument>
  )
}

function RootDocument(props: Readonly<{ children: Solid.JSX.Element }>) {
  return (
    <html>
      <head>
        <HeadContent />
        <HydrationScript />
      </head>
      <body>
        <Solid.Suspense>{props.children}</Solid.Suspense>
        <Scripts />
      </body>
    </html>
  )
}
