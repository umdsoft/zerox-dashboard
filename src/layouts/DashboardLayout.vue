<script setup>
import { computed, ref } from 'vue';
import { useRouter, useRoute, RouterView, RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import AppButton from '../components/ui/AppButton.vue';

const router = useRouter();
const route = useRoute();
const sidebarOpen = ref(true);
const authStore = useAuthStore();

const navigation = [
  { name: 'Dashboard', to: { name: 'dashboard' }, icon: 'home' },
  { name: 'Foydalanuvchilar', to: { name: 'users' }, icon: 'users' },
  { name: 'To‘lovlar', to: { name: 'payments' }, icon: 'credit-card' },
  { name: 'Qarz shartnomalari', to: { name: 'contracts' }, icon: 'document-text' }
];

const activePath = computed(() => route.name);

const initials = computed(() => {
  if (!authStore.user?.name) return 'AD';
  return authStore.user.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
});

const handleLogout = () => {
  authStore.logout();
  router.replace({ name: 'login' });
};

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};
</script>

<template>
  <div class="min-h-screen flex bg-slate-100">
    <aside
      :class="[
        'transition-all duration-200 ease-in-out bg-white border-r border-slate-200 flex flex-col',
        sidebarOpen ? 'w-64' : 'w-20'
      ]"
    >
      <div class="flex items-center justify-between px-6 py-5 border-b border-slate-200">
        <div class="flex items-center gap-2">
          <div class="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-semibold">
            ZX
          </div>
          <div v-if="sidebarOpen" class="text-lg font-semibold text-slate-800">ZeroX Admin</div>
        </div>
        <button
          class="h-9 w-9 rounded-lg bg-slate-100 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
          @click="toggleSidebar"
        >
          <span class="sr-only">Toggle sidebar</span>
          <svg class="h-5 w-5 mx-auto" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      <nav class="flex-1 overflow-y-auto py-6">
        <ul class="space-y-1 px-3">
          <li v-for="item in navigation" :key="item.name">
            <RouterLink
              :to="item.to"
              class="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition"
              :class="activePath === item.to.name
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'"
            >
              <span
                class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600"
              >
                <svg
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    :d="
                      item.icon === 'home'
                        ? 'M3 9.75L12 4l9 5.75V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'
                        : item.icon === 'users'
                        ? 'M17 20v-2a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v2M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm6 13v-2a3 3 0 0 0-2-2.82M21 7a3 3 0 0 1-5.72 1'
                        : item.icon === 'credit-card'
                        ? 'M2.25 9h19.5M4.5 15h5.25M3 5.25h18a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-.75.75H3A.75.75 0 0 1 2.25 18V6A.75.75 0 0 1 3 5.25z'
                        : 'M4.5 4.5h11.25L21 9.75V19.5a.75.75 0 0 1-.75.75H4.5A.75.75 0 0 1 3.75 19.5V5.25a.75.75 0 0 1 .75-.75zm7.5 7.5h5.25M12 15h5.25M6.75 12h1.5v6h-1.5z'
                    "
                  />
                </svg>
              </span>
              <span v-if="sidebarOpen">{{ item.name }}</span>
            </RouterLink>
          </li>
        </ul>
      </nav>
      <div class="border-t border-slate-200 p-6">
        <div class="flex items-center gap-3" v-if="authStore.user">
          <div class="h-11 w-11 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold">
            {{ initials }}
          </div>
          <div v-if="sidebarOpen" class="space-y-1">
            <p class="text-sm font-semibold text-slate-800">{{ authStore.user.name }}</p>
            <p class="text-xs text-slate-500">{{ authStore.user.role?.name || 'Administrator' }}</p>
          </div>
        </div>
      </div>
    </aside>
    <main class="flex-1 flex flex-col">
      <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
        <div class="flex items-center gap-3">
          <button
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-indigo-200 hover:text-indigo-600 lg:hidden"
            @click="toggleSidebar"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 5.25h16.5M3.75 12h16.5M3.75 18.75h16.5" />
            </svg>
            Menu
          </button>
          <h1 class="text-lg font-semibold text-slate-800 capitalize">{{ route.name }}</h1>
        </div>
        <div class="flex items-center gap-3">
          <AppButton variant="secondary" size="sm" @click="handleLogout">Chiqish</AppButton>
        </div>
      </header>
      <section class="flex-1 overflow-y-auto p-6">
        <RouterView />
      </section>
    </main>
  </div>
</template>
