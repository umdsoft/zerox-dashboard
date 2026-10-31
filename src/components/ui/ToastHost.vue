<script setup>
import { toasts, dismiss } from '../../lib/toast';

const cls = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
  info: 'border-slate-200 bg-white text-slate-800',
};
</script>

<template>
  <div class="pointer-events-none fixed right-4 top-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite" role="status">
    <div
      v-for="t in toasts"
      :key="t.id"
      :class="['pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg', cls[t.type] || cls.info]"
    >
      <p class="flex-1 break-words">{{ t.text }}</p>
      <button type="button" class="rounded text-slate-500 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label="Xabarni yopish" @click="dismiss(t.id)">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
      </button>
    </div>
  </div>
</template>
