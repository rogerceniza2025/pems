import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  useTheme,
} from '@pems/ui'
import { createFileRoute } from '@tanstack/solid-router'
import {
  ArrowRight,
  BarChart3,
  Check,
  Moon,
  Quote,
  Sun,
  Users,
  Zap,
} from 'lucide-solid'
import { For, Show, createSignal } from 'solid-js'
import { LoginModal } from '../components/auth/LoginModal'
import { Navbar } from '../components/layout/Navbar'

export const Route = createFileRoute('/')({
  component: Index,
})

// Theme Toggle Button Component - uses centralized theme context
// Only this component needs isHydrated() because it reads theme state
function ThemeToggleButton() {
  const { resolvedTheme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      class="p-2 rounded-lg bg-card hover:bg-accent transition-colors duration-200 border border-border hover:border-primary"
      title="Toggle theme"
    >
      <Show
        when={resolvedTheme() === 'dark'}
        fallback={<Sun class="w-5 h-5 text-amber-500" />}
      >
        <Moon class="w-5 h-5 text-indigo-400" />
      </Show>
    </button>
  )
}

export default function Index() {
  const [loginOpen, setLoginOpen] = createSignal(false)

  const features = [
    {
      icon: BarChart3,
      title: 'Real-Time Insights',
      desc: 'Monitor performance metrics with instant visualizations and detailed reports.',
    },
    {
      icon: Users,
      title: 'Employee Engagement',
      desc: 'Boost morale with automated surveys, recognition workflows, and feedback loops.',
    },
    {
      icon: Zap,
      title: 'Seamless Integration',
      desc: 'Built on a modern stack with TanStack, Solid, and Nitro for maximum performance.',
    },
  ]

  const pricingTiers = [
    {
      tier: 'Starter',
      price: '$0',
      desc: 'Perfect for small teams getting started.',
      features: [
        'Up to 10 users',
        'Basic Analytics',
        'Community Support',
        'Email Support',
      ],
    },
    {
      tier: 'Growth',
      price: '$29',
      desc: 'Everything you need for scaling businesses.',
      popular: true,
      features: [
        'Up to 50 users',
        'Advanced Analytics',
        'Priority Support',
        'Custom Workflows',
        'API Access',
      ],
    },
    {
      tier: 'Enterprise',
      price: 'Custom',
      desc: 'Enterprise-grade security and control.',
      features: [
        'Unlimited users',
        'Dedicated Account Manager',
        'SLA',
        'SSO & Audit Logs',
        'Custom Integration',
      ],
    },
  ]

  const testimonials = [
    {
      quote:
        'PEMS improved our employee engagement tracking overnight. The insights are invaluable.',
      author: 'Alex Chen',
      role: 'HR Director at TechCorp Inc.',
    },
    {
      quote:
        'Finally a platform that unifies performance and morale analytics in one beautiful interface.',
      author: 'Jamie Rodriguez',
      role: 'COO at StartUp Rocket',
    },
  ]

  return (
    <div class="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Background Effects */}
      <div class="fixed inset-0 -z-10 h-full w-full bg-background">
        <div class="absolute top-0 z-[-2] h-screen w-screen bg-primary/5" />
      </div>

      <Navbar
        onLogin={() => setLoginOpen(true)}
        extraContent={<ThemeToggleButton />}
      />

      <main class="relative">
        {/* Hero Section */}
        <section class="relative max-w-7xl mx-auto px-6 pt-40 pb-32 text-center">
          {/* Announcement Badge */}
          <div class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-12 shadow-lg">
            <span class="relative flex h-2.5 w-2.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
            </span>
            <span class="text-primary font-bold">
              v2.0 is now live — Experience the future
            </span>
          </div>

          {/* Main Headline */}
          <h1 class="text-7xl md:text-8xl font-black leading-tight mb-10 tracking-tight">
            <span class="block text-foreground">Smart Performance</span>
            <span class="block mt-3 text-primary">Management</span>
          </h1>

          {/* Subtitle */}
          <p class="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-16 leading-relaxed">
            PEMS unifies performance tracking, analytics, engagement, and
            workflows into{' '}
            <span class="text-foreground font-semibold">
              modern SaaS platform
            </span>{' '}
            designed for high-performing teams.
          </p>

          {/* CTA Buttons - Render immediately, no hydration gate needed for buttons */}
          <div class="flex flex-col sm:flex-row gap-5 justify-center items-center mb-20">
            <Button
              variant="default"
              size="lg"
              class="shadow-xl shadow-primary/25 text-base font-semibold px-8"
              onClick={() => setLoginOpen(true)}
              icon={<ArrowRight class="w-5 h-5" />}
              iconPosition="right"
            >
              Get Started Free
            </Button>
            <Button
              variant="outline"
              size="lg"
              class="border-2 text-base font-semibold px-8"
            >
              Watch Demo
            </Button>
          </div>

          {/* Social Proof */}
          <div class="flex flex-wrap items-center justify-center gap-10 text-sm">
            <div class="flex items-center gap-3">
              <div class="flex -space-x-3">
                <div class="w-10 h-10 rounded-full bg-primary border-2 border-background shadow-lg" />
                <div class="w-10 h-10 rounded-full bg-secondary border-2 border-background shadow-lg" />
                <div class="w-10 h-10 rounded-full bg-accent border-2 border-background shadow-lg" />
                <div class="w-10 h-10 rounded-full bg-primary/80 border-2 border-background shadow-lg flex items-center justify-center text-xs font-bold text-primary-foreground">
                  10K+
                </div>
              </div>
              <div class="text-left">
                <div class="font-semibold text-foreground">10,000+ teams</div>
                <div class="text-muted-foreground text-xs">
                  already using PEMS
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div class="flex gap-0.5 text-yellow-500 text-lg">★★★★★</div>
              <div class="text-left">
                <div class="font-semibold text-foreground">4.9/5 rating</div>
                <div class="text-muted-foreground text-xs">
                  from 2,000+ reviews
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Preview Section */}
        <section class="max-w-7xl mx-auto px-6 pb-32">
          <div class="relative rounded-3xl border border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl overflow-hidden p-3">
            <div class="absolute inset-0 bg-primary/5 opacity-50" />
            <div class="p-8 text-center text-muted-foreground">
              <p class="text-lg">Dashboard Preview</p>
              <p class="text-sm mt-2">Component temporarily disabled</p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          class="max-w-7xl mx-auto px-6 py-32 relative overflow-hidden"
        >
          <div class="text-center mb-20">
            <h2 class="text-5xl md:text-6xl font-bold mb-6 text-foreground">
              Why Choose PEMS?
            </h2>
            <p class="text-muted-foreground text-xl max-w-2xl mx-auto leading-relaxed">
              Everything you need to manage your team's performance in one
              powerful platform.
            </p>
          </div>

          <div class="grid md:grid-cols-3 gap-8">
            <For each={features}>
              {(feature) => (
                <Card
                  variant="elevated"
                  shadow="lg"
                  hover="lift"
                  class="group border border-border/50"
                >
                  <CardContent class="pt-8 pb-8">
                    <div class="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary mb-8 group-hover:scale-110 transition-all duration-300 shadow-lg">
                      <feature.icon class="w-7 h-7" />
                    </div>
                    <h3 class="text-2xl font-bold mb-4">{feature.title}</h3>
                    <p class="text-muted-foreground leading-relaxed text-base">
                      {feature.desc}
                    </p>
                  </CardContent>
                </Card>
              )}
            </For>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" class="max-w-7xl mx-auto px-6 py-32 relative">
          <div class="text-center mb-20">
            <h2 class="text-5xl md:text-6xl font-bold mb-6 text-foreground">
              Simple, Transparent Pricing
            </h2>
            <p class="text-muted-foreground text-xl">
              Choose the plan that's right for your team. No hidden fees.
            </p>
          </div>

          <div class="grid md:grid-cols-3 gap-8 items-start">
            <For each={pricingTiers}>
              {(tier) => (
                <Card
                  variant={tier.popular ? 'elevated' : 'outlined'}
                  shadow={tier.popular ? 'xl' : 'md'}
                  hover="lift"
                  class={`relative ${tier.popular ? 'border-primary ring-2 ring-primary scale-105' : 'border-border/50'}`}
                >
                  <Show when={tier.popular}>
                    <div class="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-lg">
                      ⭐ Most Popular
                    </div>
                  </Show>
                  <CardHeader class="pb-8">
                    <CardTitle class="text-2xl mb-6">{tier.tier}</CardTitle>
                    <div class="flex items-baseline gap-2 mb-4">
                      <span class="text-5xl font-black text-foreground">
                        {tier.price}
                      </span>
                      <Show when={tier.price !== 'Custom'}>
                        <span class="text-muted-foreground text-lg">
                          /month
                        </span>
                      </Show>
                    </div>
                    <p class="text-muted-foreground text-base leading-relaxed">
                      {tier.desc}
                    </p>
                  </CardHeader>

                  <CardContent>
                    <ul class="space-y-4">
                      <For each={tier.features}>
                        {(feat) => (
                          <li class="flex items-start gap-3">
                            <div class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                              <Check class="w-4 h-4" />
                            </div>
                            <span class="text-foreground">{feat}</span>
                          </li>
                        )}
                      </For>
                    </ul>
                  </CardContent>

                  <CardFooter class="pt-8">
                    <Button
                      variant={tier.popular ? 'default' : 'outline'}
                      class={`w-full text-base font-semibold ${tier.popular ? 'shadow-lg shadow-primary/30' : ''}`}
                    >
                      Choose {tier.tier}
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </For>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" class="max-w-7xl mx-auto px-6 py-32">
          <div class="text-center mb-20">
            <h2 class="text-5xl md:text-6xl font-bold mb-6 text-foreground">
              Loved by Modern Teams
            </h2>
            <p class="text-muted-foreground text-xl">
              See what our customers have to say about PEMS.
            </p>
          </div>
          <div class="grid md:grid-cols-2 gap-8">
            <For each={testimonials}>
              {(testimonial) => (
                <Card
                  variant="elevated"
                  shadow="lg"
                  hover="lift"
                  class="border border-border/50"
                >
                  <CardContent class="pt-10 pb-10 relative">
                    <Quote class="absolute top-8 right-8 w-12 h-12 text-primary/10" />
                    <p class="text-xl mb-8 leading-relaxed relative z-10 font-medium">
                      "{testimonial.quote}"
                    </p>
                    <div class="flex items-center gap-4">
                      <div class="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                        {testimonial.author.charAt(0)}
                      </div>
                      <div>
                        <h4 class="font-bold text-lg">{testimonial.author}</h4>
                        <p class="text-muted-foreground text-sm">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </For>
          </div>
        </section>

        {/* CTA Section */}
        <section class="max-w-7xl mx-auto px-6 py-32 text-center">
          <div class="relative rounded-3xl bg-primary/10 border border-primary/20 p-16 overflow-hidden">
            <div class="relative z-10">
              <h2 class="text-5xl font-bold mb-6 text-foreground">
                Ready to get started?
              </h2>
              <p class="text-muted-foreground mb-10 max-w-2xl mx-auto text-xl leading-relaxed">
                Join thousands of teams already using PEMS to drive performance
                and engagement.
              </p>
              <div class="flex gap-4 justify-center">
                <Button
                  variant="default"
                  size="lg"
                  class="shadow-lg shadow-primary/25"
                  onClick={() => setLoginOpen(true)}
                >
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer class="py-16 border-t border-border bg-muted/10">
        <div class="max-w-7xl mx-auto px-6">
          <div class="flex items-center justify-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg">
              P
            </div>
            <span class="font-black text-2xl">PEMS</span>
          </div>
          <p class="text-muted-foreground text-center text-sm">
            © 2025 PEMS — All rights reserved. Built with ❤️ for high-performing
            teams.
          </p>
        </div>
      </footer>

      <LoginModal open={loginOpen()} onClose={() => setLoginOpen(false)} />
    </div>
  )
}
