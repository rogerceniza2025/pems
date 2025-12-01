import { render } from 'solid-js/web'
import './index.css'
import { RouterProvider } from '@tanstack/solid-router'
import { router } from './router'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element not found')
}

render(() => <RouterProvider router={router} />, root)
