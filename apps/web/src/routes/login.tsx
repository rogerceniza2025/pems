import { createSignal, Show } from "solid-js";
import { Link, createFileRoute } from "@tanstack/solid-router";
import { TextField, Checkbox, Button } from "@kobalte/core";
import {
  School,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  Github,
  Check
} from "lucide-solid";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// --- Utility ---
function classNames(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const [isLoading, setIsLoading] = createSignal(false);
  const [showPassword, setShowPassword] = createSignal(false);

  // Mock Submit Handler
  const handleSubmit = (e: Event) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div class="flex min-h-screen w-full bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-50 transition-colors duration-300">

      {/* LEFT SIDE: Form Section */}
      <div class="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24 z-10">
        <div class="mx-auto w-full max-w-sm lg:w-96">

          {/* Header & Logo */}
          <div class="mb-8">
            <Link href="/" class="group flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors mb-6">
              <ArrowLeft class="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to Home
            </Link>
            <div class="flex items-center gap-2 mb-2">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-indigo-500/20 shadow-lg">
                <School size={24} />
              </div>
              <span class="text-2xl font-bold text-slate-900 dark:text-white">PEMS</span>
            </div>
            <h2 class="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Welcome back
            </h2>
            <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Public Employment Management System
            </p>
          </div>

          <div class="mt-8">
            {/* Social Login Buttons */}
            <div class="grid grid-cols-2 gap-3">
              <Button.Root class="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-all">
                <Github class="mr-2 h-5 w-5" />
                GitHub
              </Button.Root>
              <Button.Root class="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-all">
                {/* Google Icon SVG manually since Lucide doesn't have a perfect brand logo */}
                <svg class="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </Button.Root>
            </div>

            <div class="relative mt-6">
              <div class="absolute inset-0 flex items-center" aria-hidden="true">
                <div class="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="bg-white px-2 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Main Form */}
            <form class="mt-6 space-y-6" onSubmit={handleSubmit}>

              {/* Email Field */}
              <TextField.Root class="space-y-1">
                <TextField.Label class="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Email address
                </TextField.Label>
                <div class="relative">
                  <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail class="h-5 w-5 text-slate-400" aria-hidden="true" />
                  </div>
                  <TextField.Input
                    type="email"
                    placeholder="admin@pems.gov.ph"
                    required
                    class="block w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400 sm:text-sm transition-all shadow-sm"
                  />
                </div>
              </TextField.Root>

              {/* Password Field */}
              <TextField.Root class="space-y-1">
                <TextField.Label class="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Password
                </TextField.Label>
                <div class="relative">
                  <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock class="h-5 w-5 text-slate-400" aria-hidden="true" />
                  </div>
                  <TextField.Input
                    type={showPassword() ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    class="block w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400 sm:text-sm transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword())}
                    class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <Show when={showPassword()} fallback={<Eye class="h-5 w-5" />}>
                      <EyeOff class="h-5 w-5" />
                    </Show>
                  </button>
                </div>
              </TextField.Root>

              <div class="flex items-center justify-between">
                <Checkbox.Root class="flex items-center space-x-2">
                  <Checkbox.Input class="peer" />
                  <Checkbox.Control class="flex h-4 w-4 items-center justify-center rounded border border-slate-300 bg-white text-indigo-600 peer-focus:ring-2 peer-focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:ring-offset-slate-900">
                    <Checkbox.Indicator>
                      <Check class="h-3 w-3" />
                    </Checkbox.Indicator>
                  </Checkbox.Control>
                  <Checkbox.Label class="text-sm font-medium text-slate-700 dark:text-slate-300 select-none">
                    Remember me
                  </Checkbox.Label>
                </Checkbox.Root>

                <div class="text-sm">
                  <a href="#" class="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                    Forgot password?
                  </a>
                </div>
              </div>

              <Button.Root
                type="submit"
                disabled={isLoading()}
                class="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:focus:ring-offset-slate-900"
              >
                <Show when={isLoading()} fallback="Sign in">
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </Show>
              </Button.Root>
            </form>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Visual/Testimonial */}
      <div class="hidden relative lg:flex lg:w-0 lg:flex-1 bg-slate-50 dark:bg-slate-900">
        {/* Abstract Background or Image */}
        <div class="absolute inset-0 h-full w-full">
            <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2850&q=80"
                alt="Public service workers collaborating"
                class="h-full w-full object-cover opacity-90 dark:opacity-40 grayscale-[20%]"
            />
             {/* Gradient Overlay */}
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-slate-900/10" />
        </div>

        {/* Content overlaid on image */}
        <div class="relative z-10 flex w-full flex-col justify-end p-20">
            <blockquote class="space-y-4">
                <div class="flex gap-1 mb-4">
                   {[1,2,3,4,5].map(() => (
                       <svg class="h-5 w-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                           <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                       </svg>
                   ))}
                </div>
                <p class="text-xl font-medium leading-relaxed text-white">
                "PEMS has completely streamlined our public employment management process. The analytics dashboard alone saved us hundreds of hours this quarter."
                </p>
                <footer class="mt-4">
                    <p class="text-base font-semibold text-white">Maria Santos</p>
                    <p class="text-sm text-slate-300">HR Director, Department of Education</p>
                </footer>
            </blockquote>
        </div>
      </div>

    </div>
  );
}