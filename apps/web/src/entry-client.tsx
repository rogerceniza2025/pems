import { RouterProvider } from '@tanstack/solid-router'
import { render } from 'solid-js/web'
import { getRouter } from './router'
// CSS is now loaded via __root.tsx for faster loading

const router = getRouter()

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element not found')
}

render(() => <RouterProvider router={router} />, root)
