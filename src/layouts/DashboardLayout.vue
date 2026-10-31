<script setup>
import { computed, ref, watch } from 'vue';
import { useRouter, useRoute, RouterView, RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import SessionWarning from '../components/ui/SessionWarning.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// lg dan kichik ekranlarda sidebar — yopiladigan panel; katta ekranda doim ochiq (yig'ish mumkin)
const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
const sidebarOpen = ref(isDesktop());

const ICONS = {
  home: 'M3 9.75L12 4l9 5.75V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  users: 'M17 20v-2a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v2M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm6 13v-2a3 3 0 0 0-2-2.82M21 7a3 3 0 0 1-5.72 1',
  'credit-card': 'M2.25 9h19.5M4.5 15h5.25M3 5.25h18a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-.75.75H3A.75.75 0 0 1 2.25 18V6A.75.75 0 0 1 3 5.25z',
  megaphone: 'M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46',
  mobile: 'M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3',
  wallet: 'M21 12a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 1 3 7.5m18 4.5v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18V7.5m18 4.5H16.5a1.5 1.5 0 1 0 0 3H21M3 7.5A2.25 2.25 0 0 1 5.25 5.25h13.5A2.25 2.25 0 0 1 21 7.5',
  chart: 'M3 13.5l4.5-4.5 3 3 6-6M21 6v4.5h-4.5M3.75 20.25h16.5',
  book: 'M12 6.75c-1.5-1.2-3.75-1.5-5.25-1.5-1.02 0-1.8.12-2.25.24V18.5c.45-.12 1.23-.24 2.25-.24 1.5 0 3.75.3 5.25 1.5m0-12.75c1.5-1.2 3.75-1.5 5.25-1.5 1.02 0 1.8.12 2.25.24V18.5c-.45-.12-1.23-.24-2.25-.24-1.5 0-3.75.3-5.25 1.5m0-12.75V19.5',
  cash: 'M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  phone: 'M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3',
  document: 'M4.5 4.5h11.25L21 9.75V19.5a.75.75 0 0 1-.75.75H4.5A.75.75 0 0 1 3.75 19.5V5.25a.75.75 0 0 1 .75-.75zm7.5 7.5h5.25M12 15h5.25M6.75 12h1.5v6h-1.5z',
  shield: 'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z',
  key: 'M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z',
};

// permission — rolga qarab menyudan yashiriladi (backend baribir tekshiradi)
const navigation = [
  { name: 'Boshqaruv paneli', to: { name: 'dashboard' }, icon: 'home' },
  { name: 'Foydalanuvchilar', to: { name: 'users' }, icon: 'users' },
  { name: 'To‘lovlar', to: { name: 'payments' }, icon: 'credit-card' },
  { name: 'Qarz shartnomalari', to: { name: 'contracts' }, icon: 'document' },
  { name: 'Qarz daftari', to: { name: 'stats-qarz-daftari' }, icon: 'book' },
  { name: 'Shaxsiy qarz', to: { name: 'stats-personal-debt' }, icon: 'wallet' },
  { name: 'Shaxsiy moliya', to: { name: 'stats-personal-finance' }, icon: 'chart' },
  { name: 'Daromad', to: { name: 'stats-revenue' }, icon: 'cash' },
  { name: 'Mobil balans', to: { name: 'stats-mobile-balance' }, icon: 'phone' },
  { name: 'Mobil versiya', to: { name: 'mobile-version' }, icon: 'mobile' },
  { name: 'Xabar yuborish', to: { name: 'broadcast' }, icon: 'megaphone', permission: 'broadcast' },
  { name: 'Audit jurnali', to: { name: 'audit' }, icon: 'shield', permission: 'audit' },
  { name: 'Adminlar', to: { name: 'admins' }, icon: 'key', permission: 'manageAdmins' },
];
const visibleNav = computed(() => navigation.filter((n) => !n.permission || authStore.can(n.permission)));

const activePath = computed(() => route.name);

// Sarlavha router meta.title dan; sahifaning o'z h1'i bo'lgan sahifalarda ko'rsatilmaydi
const SELF_TITLED = new Set(['users', 'payments', 'broadcast', 'contracts', 'stats-personal-debt', 'stats-personal-finance', 'stats-qarz-daftari', 'stats-mobile-balance', 'stats-revenue', 'audit', 'admins']);
const pageTitle = computed(() => (SELF_TITLED.has(route.name) ? '' : route.meta?.title || ''));

const displayName = computed(() => authStore.user?.fio || authStore.user?.name || 'Administrator');
const initials = computed(() =>
  displayName.value.split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'AD'
);

const handleLogout = async () => {
  await authStore.logout(); // serverda sessiyani bekor qiladi
  router.replace({ name: 'login' });
};

const toggleSidebar = () => { sidebarOpen.value = !sidebarOpen.value; };
// Kichik ekranda sahifaga o'tganda panelni yopamiz
watch(() => route.fullPath, () => { if (!isDesktop()) sidebarOpen.value = false; });

const goBack = () => {
  if (window.history.length > 1) router.back();
  else router.push({ name: 'dashboard' });
};
</script>

<template>
  <div class="min-h-screen flex bg-slate-100">
    <!-- kichik ekranda orqa fon -->
    <div v-if="sidebarOpen" class="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" aria-hidden="true" @click="sidebarOpen = false"></div>

    <aside
      :class="[
        'z-40 flex flex-col border-r border-slate-200 bg-white transition-all duration-200 ease-in-out',
        'fixed inset-y-0 left-0 lg:static',
        sidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'
      ]"
      aria-label="Asosiy menyu"
    >
      <div class="flex items-center justify-between border-b border-slate-200 px-4 py-5">
        <div class="flex items-center gap-2">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 font-semibold text-white">ZX</div>
          <div v-if="sidebarOpen" class="text-lg font-semibold text-slate-800">ZeroX Admin</div>
        </div>
        <button
          type="button"
          class="h-9 w-9 rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          :aria-label="sidebarOpen ? 'Menyuni yig‘ish' : 'Menyuni ochish'"
          :aria-expanded="sidebarOpen"
          @click="toggleSidebar"
        >
          <svg class="mx-auto h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      <nav class="flex-1 overflow-y-auto py-4" aria-label="Bo‘limlar">
        <ul class="space-y-1 px-3">
          <li v-for="item in visibleNav" :key="item.name">
            <RouterLink
              :to="item.to"
              :title="sidebarOpen ? undefined : item.name"
              :aria-label="sidebarOpen ? undefined : item.name"
              class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              :class="activePath === item.to.name
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'"
            >
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" :d="ICONS[item.icon] || ICONS.document" />
                </svg>
              </span>
              <span v-if="sidebarOpen">{{ item.name }}</span>
            </RouterLink>
          </li>
        </ul>
      </nav>
      <div class="border-t border-slate-200 p-3">
        <div v-if="authStore.user" class="mb-2 flex items-center gap-3 px-1">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 font-semibold text-indigo-700">{{ initials }}</div>
          <div v-if="sidebarOpen" class="min-w-0">
            <p class="truncate text-sm font-semibold text-slate-800">{{ displayName }}</p>
            <p class="truncate text-xs text-slate-500">{{ authStore.roleLabel }}</p>
          </div>
        </div>
        <button
          type="button"
          :class="['group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500', sidebarOpen ? '' : 'justify-center']"
          :aria-label="sidebarOpen ? undefined : 'Chiqish'"
          @click="handleLogout"
        >
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 group-hover:bg-rose-100 group-hover:text-rose-600">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
          </span>
          <span v-if="sidebarOpen">Chiqish</span>
        </button>
      </div>
    </aside>

    <main class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-indigo-200 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden"
            aria-label="Menyuni ochish"
            @click="toggleSidebar"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 5.25h16.5M3.75 12h16.5M3.75 18.75h16.5" />
            </svg>
            Menyu
          </button>
          <button
            v-if="route.name !== 'dashboard'"
            type="button"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            @click="goBack"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
            Orqaga
          </button>
          <h1 v-if="pageTitle" class="text-lg font-semibold text-slate-800">{{ pageTitle }}</h1>
        </div>
      </header>
      <section class="flex-1 overflow-y-auto p-4 sm:p-6">
        <RouterView />
      </section>
    </main>
    <SessionWarning />
  </div>
</template>
