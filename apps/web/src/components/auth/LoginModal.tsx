import { createSignal, Show } from "solid-js";
import { Button } from "@kobalte/core/button";

// Placeholder client-side login function which you should wire to your BetterAuth client SDK
export async function clientSignIn(email, password) {
  // Example: await betterauth.signIn({ email, password })
  // Replace with your provider's client call.
  return { ok: true, user: { email } };
}

export function LoginModal(props) {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await clientSignIn(email(), password());
      if (res.ok) {
        props.onSuccess?.(res.user);
        props.onClose?.();
      } else {
        setError(res.error || "Login failed");
      }
    } catch (e) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Show when={props.open}>
      <div class="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
        <div class={`bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-xl w-full max-w-md transition-all duration-300 ${
          props.open ? 'scale-100 opacity-100' : 'scale-92 opacity-0'
        }`}>
          <h2 class="text-2xl font-bold mb-4 text-center">Login to PEMS</h2>
          <div class="flex flex-col gap-4">
            <input
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
              class="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
              placeholder="Email"
            />
            <input
              value={password()}
              type="password"
              onInput={(e) => setPassword(e.currentTarget.value)}
              class="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
              placeholder="Password"
            />
            <Button
              disabled={loading()}
              onClick={submit}
              class="rounded-xl px-4 py-2 bg-blue-600 text-white w-full"
            >
              {loading() ? 'Signing in...' : 'Login'}
            </Button>
            {error() && <div class="text-red-500 text-sm">{error()}</div>}
          </div>
          <button
            onClick={props.onClose}
            class="block text-center mt-4 text-neutral-600 dark:text-neutral-400 hover:underline"
          >
            Close
          </button>
        </div>
      </div>
    </Show>
  );
}

// Exportable Login route component for TanStack Start (place under src/routes/login.tsx)
export function LoginRoute() {
  const [open, setOpen] = createSignal(true);
  const handleSuccess = (user) => {
    // Example: redirect to dashboard
    console.log('signed in', user);
    setOpen(false);
  };

  return (
    <div class="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
      <LoginModal open={open()} onClose={() => setOpen(false)} onSuccess={handleSuccess} />
      <div class="p-8">
        <h2 class="text-3xl font-bold mb-4">Welcome back</h2>
        <p class="text-neutral-600 dark:text-neutral-300 mb-6">Sign in to continue to your PEMS workspace.</p>
        <Button onClick={() => setOpen(true)} class="bg-blue-600 text-white px-6 py-3 rounded-xl">Open Login</Button>
      </div>
    </div>
  );
}