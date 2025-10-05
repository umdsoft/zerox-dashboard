<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import AppButton from '../../components/ui/AppButton.vue';

const router = useRouter();
const authStore = useAuthStore();

const form = reactive({
  phone: '',
  password: ''
});

const errorMessage = ref('');

const handleSubmit = async () => {
  errorMessage.value = '';
  try {
    await authStore.login({ phone: form.phone, password: form.password });
    await router.replace({ name: 'dashboard' });
  } catch (error) {
    errorMessage.value =
      error?.response?.data?.message || error?.message || 'Unable to login. Please check your credentials.';
  }
};
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-100 px-4">
    <div class="w-full max-w-md space-y-8 rounded-3xl bg-white p-10 shadow-xl ring-1 ring-slate-200/60">
      <div class="space-y-2 text-center">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-semibold">
          ZX
        </div>
        <h1 class="text-2xl font-semibold text-slate-800">Welcome back</h1>
        <p class="text-sm text-slate-500">Sign in with your phone number and password to access the dashboard.</p>
      </div>
      <form class="space-y-6" @submit.prevent="handleSubmit">
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700" for="phone">Phone number</label>
          <input
            id="phone"
            v-model="form.phone"
            type="tel"
            placeholder="+998 90 123 45 67"
            required
            class="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700" for="password">Password</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="••••••••"
            required
            class="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <p v-if="errorMessage" class="text-sm text-red-500">{{ errorMessage }}</p>
        <AppButton type="submit" size="lg" class="w-full" :disabled="authStore.loading">
          <span v-if="authStore.loading" class="flex items-center gap-2">
            <svg class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Signing in...
          </span>
          <span v-else>Sign In</span>
        </AppButton>
      </form>
    </div>
  </div>
</template>
