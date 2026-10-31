<script setup>
import { computed } from 'vue'

// Oddiy sahifalash paneli: "1–10 / 31" + Oldingi / Keyingi + sahifa raqamlari.
const props = defineProps({
  page: { type: Number, default: 1 },
  limit: { type: Number, default: 10 },
  total: { type: Number, default: 0 },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['change'])

const pages = computed(() => Math.max(1, Math.ceil(props.total / props.limit)))
const from = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.limit + 1))
const to = computed(() => Math.min(props.total, props.page * props.limit))

// Joriy sahifa atrofidagi raqamlar (maks 5 ta).
const nums = computed(() => {
  const start = Math.max(1, Math.min(props.page - 2, pages.value - 4))
  const end = Math.min(pages.value, start + 4)
  const out = []
  for (let i = start; i <= end; i++) out.push(i)
  return out
})

function go(p) {
  if (props.disabled || p < 1 || p > pages.value || p === props.page) return
  emit('change', p)
}
const btn = 'px-2.5 py-1 rounded-lg border text-sm transition disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
</script>

<template>
  <nav class="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-t border-slate-100 text-sm text-slate-600" aria-label="Sahifalash">
    <span>{{ from }}–{{ to }} / {{ total }}</span>
    <div class="flex items-center gap-1">
      <button type="button" :class="[btn, 'text-slate-600 hover:bg-slate-50']" :disabled="disabled || page <= 1" @click="go(page - 1)">Oldingi</button>
      <button
        v-for="p in nums" :key="p" type="button" :aria-current="p === page ? 'page' : undefined" :aria-label="`${p}-sahifa`"
        :class="[btn, p === page ? 'bg-indigo-600 border-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50']"
        :disabled="disabled" @click="go(p)"
      >{{ p }}</button>
      <button type="button" :class="[btn, 'text-slate-600 hover:bg-slate-50']" :disabled="disabled || page >= pages" @click="go(page + 1)">Keyingi</button>
    </div>
  </nav>
</template>
