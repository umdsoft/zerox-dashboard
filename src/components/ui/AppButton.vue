<script setup>
import { computed } from 'vue';

const props = defineProps({
  type: { type: String, default: 'button' },
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'ghost'].includes(value)
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  },
  disabled: { type: Boolean, default: false }
});

const classes = computed(() => {
  const base =
    'inline-flex items-center justify-center rounded-xl font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-500',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-400',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-400'
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-base'
  };

  return [base, variants[props.variant], sizes[props.size]].join(' ');
});
</script>

<template>
  <button :type="props.type" :class="classes" :disabled="props.disabled">
    <slot />
  </button>
</template>
