import { createRouter, createWebHistory } from 'vue-router';
import { registerAuthGuard } from '../middleware/authGuard';
import { registerAuthFailure } from '../stores/auth';

// Barcha sahifalar lazy (dynamic import) — asosiy chunk kichik qoladi.
// meta.title — brauzer sarlavhasi va yuqori sarlavha; meta.permission — rol cheklovi (stores/auth.js PERMISSIONS).
const auth = { requiresAuth: true };
const r = (path, name, loader, title, extra = {}) => ({
  path, name, component: loader, meta: { ...auth, title, ...extra },
});

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/auth/login',
      name: 'login',
      component: () => import('../pages/Auth/Login.vue'),
      meta: { public: true, title: 'Kirish' },
    },
    {
      path: '/',
      component: () => import('../layouts/DashboardLayout.vue'),
      meta: auth,
      children: [
        r('', 'dashboard', () => import('../pages/Dashboard/Index.vue'), 'Boshqaruv paneli'),
        r('users', 'users', () => import('../pages/Users/Index.vue'), 'Foydalanuvchilar'),
        r('users/:id', 'users-detail', () => import('../pages/Users/Detail.vue'), 'Foydalanuvchi tafsiloti'),
        r('users/:id/contracts', 'users-detail-contracts', () => import('../pages/Users/Contracts.vue'), 'Foydalanuvchi shartnomalari'),
        r('users/:id/creditor/history', 'users-creditor-history', () => import('../pages/Users/contracts/creditor-history.vue'), 'Kreditor shartnomalari tarixi'),
        r('users/:id/debitor/history', 'users-debitor-history', () => import('../pages/Users/contracts/debitor-history.vue'), 'Debitor shartnomalari tarixi'),
        r('users/:id/reports/creditor', 'users-creditor-report', () => import('../pages/Users/contracts/creditor.vue'), 'Kreditor hisoboti'),
        r('users/:id/reports/debitor', 'users-debitor-report', () => import('../pages/Users/contracts/debitor.vue'), 'Debitor hisoboti'),
        r('users/:id/reports/ex-creditor', 'users-ex-creditor-report', () => import('../pages/Users/contracts/ex-creditor.vue'), 'Kreditor (arxiv) hisoboti'),
        r('users/:id/reports/ex-debitor', 'users-ex-debitor-report', () => import('../pages/Users/contracts/ex-debitor.vue'), 'Debitor (arxiv) hisoboti'),
        r('users/:id/logins', 'users-logins', () => import('../pages/Users/LoginArchive.vue'), 'Kirishlar tarixi', { permission: 'loginArchive' }),
        r('payments', 'payments', () => import('../pages/Payments/Index.vue'), 'To‘lovlar'),
        r('mobile-version', 'mobile-version', () => import('../pages/Mobile/index.vue'), 'Mobil versiya'),
        r('broadcast', 'broadcast', () => import('../pages/Broadcast/Index.vue'), 'Xabar yuborish', { permission: 'broadcast' }),
        r('contracts', 'contracts', () => import('../pages/Contracts/Index.vue'), 'Qarz shartnomalari'),
        r('contracts/:id', 'contracts-detail', () => import('../pages/Contracts/Detail.vue'), 'Shartnoma tafsiloti'),
        r('stores/:id', 'stores-detail', () => import('../pages/Stores/Detail.vue'), 'Do‘kon tafsiloti'),
        r('stats/personal-debt', 'stats-personal-debt', () => import('../pages/Stats/PersonalDebt.vue'), 'Shaxsiy qarz'),
        r('stats/personal-finance', 'stats-personal-finance', () => import('../pages/Stats/PersonalFinance.vue'), 'Shaxsiy moliya'),
        r('stats/qarz-daftari', 'stats-qarz-daftari', () => import('../pages/Stats/QarzDaftari.vue'), 'Qarz daftari'),
        r('stats/mobile-balance', 'stats-mobile-balance', () => import('../pages/Stats/MobileBalance.vue'), 'Mobil balans'),
        r('stats/revenue', 'stats-revenue', () => import('../pages/Stats/Revenue.vue'), 'Daromad'),
        r('audit', 'audit', () => import('../pages/Audit/Index.vue'), 'Audit jurnali', { permission: 'audit' }),
        r('admins', 'admins', () => import('../pages/Admins/Index.vue'), 'Adminlar', { permission: 'manageAdmins' }),
        { path: ':pathMatch(.*)*', redirect: { name: 'dashboard' } },
      ],
    },
  ],
});

registerAuthGuard(router);
registerAuthFailure(router);

export default router;
