import type { Component } from 'solid-js'

const HomePage: Component = () => {
  return (
    <div class="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header class="border-b bg-card">
        <div class="container mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <h1 class="text-2xl font-bold">PEMS</h1>
              <span class="text-muted-foreground">
                Public Employment Management System
              </span>
            </div>
            <nav class="flex items-center space-x-4">
              <a
                href="/"
                class="text-sm font-medium transition-colors hover:text-primary"
              >
                Home
              </a>
              <a
                href="/tailwind-demo"
                class="text-sm font-medium transition-colors hover:text-primary"
              >
                Tailwind Demo
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main class="container mx-auto px-4 py-8">
        <div class="space-y-8">
          {/* Hero Section */}
          <section class="hero-gradient rounded-lg p-8 text-center">
            <h2 class="text-4xl font-bold mb-4 text-gradient">
              Welcome to PEMS
            </h2>
            <p class="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              A modern Public Employment Management System built with SolidJS,
              TypeScript, and Tailwind CSS 4. Experience the power of the latest
              Tailwind CSS features in a monorepo architecture.
            </p>
            <div class="flex justify-center space-x-4">
              <a href="/tailwind-demo" class="cta-button">
                Explore Tailwind CSS 4 Demo
              </a>
              <button class="px-8 py-3 text-lg border border-border bg-background hover:bg-accent hover:text-accent-foreground rounded-md">
                Learn More
              </button>
            </div>
          </section>

          {/* Features Grid */}
          <section class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div class="feature-card">
              <div class="text-primary mb-4">
                <svg
                  class="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                  />
                </svg>
              </div>
              <h3 class="text-xl font-semibold mb-2">Modern Design System</h3>
              <p class="text-muted-foreground">
                Built with Tailwind CSS 4 featuring the latest @theme directive,
                enhanced @apply, and container queries.
              </p>
            </div>

            <div class="feature-card">
              <div class="text-primary mb-4">
                <svg
                  class="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 class="text-xl font-semibold mb-2">Monorepo Architecture</h3>
              <p class="text-muted-foreground">
                Scalable monorepo structure with shared packages, centralized
                configuration, and optimized development workflow.
              </p>
            </div>

            <div class="feature-card">
              <div class="text-primary mb-4">
                <svg
                  class="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              </div>
              <h3 class="text-xl font-semibold mb-2">TypeScript First</h3>
              <p class="text-muted-foreground">
                Full TypeScript support with strict typing, enhanced developer
                experience, and better code maintainability.
              </p>
            </div>

            <div class="feature-card">
              <div class="text-primary mb-4">
                <svg
                  class="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </div>
              <h3 class="text-xl font-semibold mb-2">Responsive Design</h3>
              <p class="text-muted-foreground">
                Mobile-first approach with container queries, responsive
                utilities, and adaptive layouts for all screen sizes.
              </p>
            </div>

            <div class="feature-card">
              <div class="text-primary mb-4">
                <svg
                  class="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 class="text-xl font-semibold mb-2">Performance Optimized</h3>
              <p class="text-muted-foreground">
                Lightning-fast builds, optimized bundle sizes, and efficient
                development with Vite and modern tooling.
              </p>
            </div>

            <div class="feature-card">
              <div class="text-primary mb-4">
                <svg
                  class="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 class="text-xl font-semibold mb-2">Secure & Reliable</h3>
              <p class="text-muted-foreground">
                Enterprise-grade security, comprehensive testing, and reliable
                deployment strategies for production use.
              </p>
            </div>
          </section>

          {/* Tailwind CSS 4 Features */}
          <section class="space-y-6">
            <h2 class="text-3xl font-bold text-center">
              Tailwind CSS 4 Features
            </h2>
            <div class="grid gap-4 md:grid-cols-2">
              <div class="card p-6">
                <h3 class="text-xl font-semibold mb-3 text-primary">
                  @theme Directive
                </h3>
                <p class="text-muted-foreground">
                  Define design tokens and theme variables directly in CSS with
                  the new @theme directive for better organization and
                  performance.
                </p>
              </div>
              <div class="card p-6">
                <h3 class="text-xl font-semibold mb-3 text-primary">
                  Enhanced @apply
                </h3>
                <p class="text-muted-foreground">
                  Improved @apply directive with better performance and more
                  intuitive syntax for component styling.
                </p>
              </div>
              <div class="card p-6">
                <h3 class="text-xl font-semibold mb-3 text-primary">
                  Container Queries
                </h3>
                <p class="text-muted-foreground">
                  Build responsive components based on their container size
                  rather than viewport for more modular designs.
                </p>
              </div>
              <div class="card p-6">
                <h3 class="text-xl font-semibold mb-3 text-primary">
                  CSS-in-JS Features
                </h3>
                <p class="text-muted-foreground">
                  Enjoy the best of both worlds with utility-first CSS and
                  component-based styling approaches.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer class="border-t bg-card mt-16">
        <div class="container mx-auto px-4 py-8">
          <div class="text-center text-sm text-muted-foreground">
            <p>&copy; 2024 PEMS. Built with SolidJS and Tailwind CSS 4.</p>
            <p class="mt-2">
              <a
                href="/tailwind-demo"
                class="hover:text-primary transition-colors"
              >
                Explore Tailwind CSS 4 Demo →
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default HomePage
