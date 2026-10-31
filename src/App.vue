<script setup>
import ToastHost from './components/ui/ToastHost.vue'
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-900">
    <RouterView />
    <ToastHost />
  </div>
</template>
