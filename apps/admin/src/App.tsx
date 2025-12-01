import { Button } from '@pems/ui'

export default function App() {
  return (
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
      <div class="max-w-md mx-auto text-center">
        <h1 class="text-3xl font-bold text-gray-900 mb-4">PEMS Admin Portal</h1>
        <p class="text-lg text-gray-600 mb-8">
          Philippine Education Management System
        </p>
        <div class="space-y-4">
          <Button variant="default" size="lg" class="w-full">
            Get Started
          </Button>
          <Button variant="outline" size="lg" class="w-full">
            View Documentation
          </Button>
        </div>
      </div>
    </div>
  )
}
