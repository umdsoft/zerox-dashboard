import { createRouter, createWebHistory } from 'vue-router';
import { registerAuthGuard } from '../middleware/authGuard';
import DashboardLayout from '../layouts/DashboardLayout.vue';
import LoginPage from '../pages/Auth/Login.vue';
import DashboardPage from '../pages/Dashboard/Index.vue';
import UsersPage from '../pages/Users/Index.vue';
import PaymentsPage from '../pages/Payments/Index.vue';
import ContractsPage from '../pages/Contracts/Index.vue';
import ContractDetailPage from '../pages/Contracts/Detail.vue';
import UserDetailPage from '../pages/Users/Detail.vue';
import UserContracts from '../pages/Users/Contracts.vue'
import CreditorHistory from '../pages/Users/contracts/creditor.vue'
import DebitoHistory from '../pages/Users/contracts/debitor.vue';
import CreditorHistoryR from '../pages/Users/contracts/creditor-history.vue'
import DebitorHistoryR from '../pages/Users/contracts/debitor-history.vue'
import UserLogins from '../pages/Users/LoginArchive.vue'
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
          path: 'users/:id',
          name: 'users-detail',
          component: UserDetailPage,
          meta: { requiresAuth: true }
        },
        {
          path: 'users/:id/contracts',
          name: 'users-detail-contracts',
          component: UserContracts,
          meta: { requiresAuth: true }
        },
        {
          path: 'users/:id/creditor/history',
          name: 'users-creditor-history',
          component: CreditorHistoryR,
          meta: { requiresAuth: true }
        },
        {
          path: 'users/:id/debitor/history',
          name: 'users-debitor-history',
          component: DebitorHistoryR,
          meta: { requiresAuth: true }
        },
        {
          path: 'users/:id/reports/creditor',
          name: 'users-creditor-report',
          component: CreditorHistory,
          meta: { requiresAuth: true }
        },
        {
          path: 'users/:id/reports/debitor',
          name: 'users-debitor-report',
          component: DebitoHistory,
          meta: { requiresAuth: true }
        },
        {
          path: 'users/:id/logins',
          name: 'users-logins',
          component: UserLogins,
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
        },
        {
          path: 'contracts/:id',
          name: 'contracts-detail',
          component: ContractDetailPage,
          meta: { requiresAuth: true }
        }
      ]
    }
  ]
});

registerAuthGuard(router);

export default router;
