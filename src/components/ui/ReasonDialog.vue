<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from 'vue';

// Sabab so'rovchi modal: eksport, PII ochish, to'lovni bekor qilish uchun umumiy.
const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Tasdiqlash' },
  minLength: { type: Number, default: 5 },
  danger: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' },
});
const emit = defineEmits(['confirm', 'cancel']);

const reason = ref('');
const input = ref(null);
const dialog = ref(null);
let previouslyFocused = null;

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

watch(() => props.open, async (v) => {
  if (v) {
    reason.value = '';
    previouslyFocused = document.activeElement;
    await nextTick();
    input.value?.focus(); // Esc va Tab modal ichida ishlashi uchun fokus darhol ichkariga
  } else if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
    previouslyFocused.focus();
    previouslyFocused = null;
  }
});
onBeforeUnmount(() => { previouslyFocused = null; });

// Fokus tuzog'i: Tab / Shift+Tab dialog ichida aylanadi, Esc yopadi
function onKeydown(e) {
  if (e.key === 'Escape') { e.stopPropagation(); emit('cancel'); return; }
  if (e.key !== 'Tab' || !dialog.value) return;
  const items = [...dialog.value.querySelectorAll(FOCUSABLE)];
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  else if (!dialog.value.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
}

const valid = () => reason.value.trim().length >= props.minLength;
function submit() {
  if (!valid() || props.busy) return;
  emit('confirm', reason.value.trim());
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" @keydown="onKeydown">
      <div ref="dialog" role="dialog" aria-modal="true" :aria-label="title" class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 class="text-lg font-semibold text-slate-800">{{ title }}</h2>
        <p v-if="message" class="mt-1 whitespace-pre-line text-sm text-slate-600">{{ message }}</p>
        <form class="mt-4 space-y-2" @submit.prevent="submit">
          <label class="text-sm font-medium text-slate-700" for="reason-input">Sabab (kamida {{ minLength }} belgi)</label>
          <textarea
            id="reason-input"
            ref="input"
            v-model="reason"
            rows="3"
            maxlength="500"
            class="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="Nima uchun bu amal bajarilmoqda?"
          ></textarea>
          <p v-if="error" class="text-sm text-rose-600" role="alert">{{ error }}</p>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400" @click="emit('cancel')">Bekor qilish</button>
            <button
              type="submit"
              :disabled="!valid() || busy"
              :class="['rounded-xl px-4 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50', danger ? 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500' : 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500']"
            >{{ busy ? 'Bajarilmoqda…' : confirmLabel }}</button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
