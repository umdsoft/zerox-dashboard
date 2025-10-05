<script setup>
const props = defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' }
});
</script>

<template>
  <div class="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60">
    <div class="space-y-2 p-6">
      <div class="flex items-center justify-between">
        <div>
          <p v-if="props.subtitle" class="text-xs font-medium uppercase tracking-wide text-slate-400">
            {{ props.subtitle }}
          </p>
          <h3 v-if="props.title" class="text-lg font-semibold text-slate-800">{{ props.title }}</h3>
        </div>
        <slot name="action" />
      </div>
      <div class="text-3xl font-semibold text-slate-900">
        <slot />
      </div>
    </div>
  </div>
</template>
