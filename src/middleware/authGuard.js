import { useAuthStore } from '../stores/auth';

export function registerAuthGuard(router) {
  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore();
    const requiresAuth = to.matched.some((record) => record.meta?.requiresAuth);
    const isPublic = to.matched.some((record) => record.meta?.public);

    if (requiresAuth) {
      if (!authStore.isAuthenticated) {
        authStore.logout();
        return next({ name: 'login', query: { redirect: to.fullPath } });
      }
      try {
        if (!authStore.user) {
          await authStore.fetchMe();
        }
        if (!authStore.isAdmin) {
          authStore.logout();
          return next({ name: 'login' });
        }
        return next();
      } catch (error) {
        authStore.logout();
        return next({ name: 'login', query: { redirect: to.fullPath } });
      }
    }

    if (isPublic && authStore.isAuthenticated) {
      try {
        if (!authStore.user) {
          await authStore.fetchMe();
        }
        if (authStore.isAdmin) {
          return next({ name: 'dashboard' });
        }
      } catch (error) {
        authStore.logout();
      }
    }

    return next();
  });
}
