import { useAuthStore } from '../stores/auth';

const DEFAULT_TITLE = 'ZeroX Admin';

export function registerAuthGuard(router) {
  router.beforeEach(async (to) => {
    const authStore = useAuthStore();
    const requiresAuth = to.matched.some((r) => r.meta?.requiresAuth);
    const isPublic = to.matched.some((r) => r.meta?.public);

    if (requiresAuth) {
      if (!authStore.isAuthenticated) {
        return { name: 'login', query: { redirect: to.fullPath } };
      }
      if (!authStore.user) {
        try {
          await authStore.fetchMe();
        } catch (_) {
          authStore.clearLocal();
          return { name: 'login', query: { redirect: to.fullPath } };
        }
      }
      // Rolga bog'liq sahifalar (masalan Audit, Adminlar — faqat super)
      const need = to.matched.map((r) => r.meta?.permission).find(Boolean);
      if (need && !authStore.can(need)) {
        return { name: 'dashboard' };
      }
      return true;
    }

    if (isPublic && authStore.isAuthenticated) {
      try {
        if (!authStore.user) await authStore.fetchMe();
        return { name: 'dashboard' };
      } catch (_) {
        authStore.clearLocal();
      }
    }
    return true;
  });

  router.afterEach((to) => {
    const t = to.meta?.title;
    document.title = t ? `${t} — ${DEFAULT_TITLE}` : DEFAULT_TITLE;
  });
}
