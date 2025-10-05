import { createRouter, createWebHistory } from 'vue-router';
import { registerAuthGuard } from '../middleware/authGuard';
import DashboardLayout from '../layouts/DashboardLayout.vue';
import LoginPage from '../pages/Auth/Login.vue';
import DashboardPage from '../pages/Dashboard/Index.vue';
import UsersPage from '../pages/Users/Index.vue';
import PaymentsPage from '../pages/Payments/Index.vue';
import ContractsPage from '../pages/Contracts/Index.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/auth/login',
      name: 'login',
      component: LoginPage,
      meta: { public: true }
    },
    {
      path: '/',
      component: DashboardLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: DashboardPage,
          meta: { requiresAuth: true }
        },
        {
          path: 'users',
          name: 'users',
          component: UsersPage,
          meta: { requiresAuth: true }
        },
        {
          path: 'payments',
          name: 'payments',
          component: PaymentsPage,
          meta: { requiresAuth: true }
        },
        {
          path: 'contracts',
          name: 'contracts',
          component: ContractsPage,
          meta: { requiresAuth: true }
        }
      ]
    }
  ]
});

registerAuthGuard(router);

export default router;
