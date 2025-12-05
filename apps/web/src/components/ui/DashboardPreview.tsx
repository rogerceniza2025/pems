export function DashboardPreview() {
  return (
    <div class={`rounded-2xl border border-border shadow-xl p-4 bg-card transition-all duration-450 hover:scale-105`}>
      <div class="h-56 grid grid-cols-12 gap-3">
        <div class="col-span-8 rounded bg-gradient-to-br from-primary/20 to-primary/40"></div>
        <div class="col-span-4 flex flex-col gap-3">
          <div class="h-1/2 rounded bg-muted"></div>
          <div class="h-1/2 rounded bg-muted"></div>
        </div>
      </div>
    </div>
  );
}