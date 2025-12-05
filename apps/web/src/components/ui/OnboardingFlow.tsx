import { createSignal, For, Show } from "solid-js";
import { Button } from "@kobalte/core/button";

export function OnboardingFlow(props) {
  const [step, setStep] = createSignal(0);
  const steps = [
    { title: 'Company Info' },
    { title: 'Teams & Roles' },
    { title: 'KPIs Setup' },
    { title: 'Invite Teammates' },
  ];

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div class="max-w-3xl mx-auto p-6 bg-white dark:bg-neutral-900 rounded-2xl shadow-md">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-xl font-bold">{steps[step()].title}</h3>
        <div class="text-sm text-neutral-600 dark:text-neutral-300">Step {step() + 1} of {steps.length}</div>
      </div>

      <div class={`min-h-[160px] transition-all duration-350`}>
        <Show when={step() === 0}>
          <div>
            <label class="block text-sm mb-2">Company name</label>
            <input class="w-full px-4 py-2 rounded border dark:border-neutral-700 mb-4" placeholder="Acme, Inc." />
            <label class="block text-sm mb-2">Industry</label>
            <input class="w-full px-4 py-2 rounded border dark:border-neutral-700" placeholder="SaaS" />
          </div>
        </Show>
        <Show when={step() === 1}>
          <div>
            <label class="block text-sm mb-2">Create Team</label>
            <input class="w-full px-4 py-2 rounded border dark:border-neutral-700" placeholder="Product" />
          </div>
        </Show>
        <Show when={step() === 2}>
          <div>
            <label class="block text-sm mb-2">Add KPI</label>
            <input class="w-full px-4 py-2 rounded border dark:border-neutral-700" placeholder="Customer Satisfaction" />
          </div>
        </Show>
        <Show when={step() === 3}>
          <div>
            <label class="block text-sm mb-2">Invite teammates (emails)</label>
            <textarea class="w-full px-4 py-2 rounded border dark:border-neutral-700" placeholder="teammate@company.com"></textarea>
          </div>
        </Show>
      </div>

      <div class="flex justify-between mt-6">
        <Button onClick={prev} disabled={step() === 0} class="px-4 py-2 rounded-xl border">Back</Button>
        <div class="flex gap-2">
          <Button onClick={next} class="px-4 py-2 rounded-xl bg-blue-600 text-white">
            {step() === steps.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}