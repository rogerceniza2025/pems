import type { Component } from 'solid-js'
import { Link } from '@tanstack/solid-router'

const UIComponentsDemo: Component = () => {
  return (
    <div class="container mx-auto p-6">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-4">
          UI Components Demo
        </h1>
        <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h2 class="text-lg font-semibold text-yellow-800 mb-2">
            ⚠️ Under Construction
          </h2>
          <p class="text-yellow-700 mb-4">
            The UI Components Demo is temporarily disabled while we resolve
            dependency issues with the form system.
          </p>
          <p class="text-yellow-700 mb-4">
            The form components require additional dependencies that are
            currently being integrated. This demo will be restored once the form
            system is fully functional.
          </p>
          <div class="space-y-2">
            <Link
              href="/"
              class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">
            ✅ Available Components
          </h3>
          <p class="text-gray-600 mb-4">
            Many UI components are working correctly and available for use.
          </p>
          <ul class="text-sm text-gray-600 space-y-1">
            <li>• Accordion</li>
            <li>• Button</li>
            <li>• Card</li>
            <li>• Checkbox</li>
            <li>• Input</li>
            <li>• Modal</li>
            <li>• Select</li>
            <li>• Table</li>
            <li>• And many more...</li>
          </ul>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">
            🔧 Under Development
          </h3>
          <p class="text-gray-600 mb-4">
            The form system is currently being enhanced with better validation
            and user experience.
          </p>
          <ul class="text-sm text-gray-600 space-y-1">
            <li>• Advanced form validation</li>
            <li>• Form field components</li>
            <li>• Form submission handling</li>
            <li>• Schema validation</li>
            <li>• Error handling</li>
          </ul>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">
            🚀 Coming Soon
          </h3>
          <p class="text-gray-600 mb-4">
            Enhanced features are being developed for the next release.
          </p>
          <ul class="text-sm text-gray-600 space-y-1">
            <li>• Enhanced form system</li>
            <li>• Better accessibility</li>
            <li>• Improved documentation</li>
            <li>• Interactive examples</li>
            <li>• Live playground</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default UIComponentsDemo
