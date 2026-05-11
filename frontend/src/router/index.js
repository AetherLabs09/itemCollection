import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '首页概览', roles: ['admin', 'warehouse'] }
      },
      {
        path: 'categories',
        name: 'Categories',
        component: () => import('../views/Categories.vue'),
        meta: { title: '物品分类', roles: ['admin'] }
      },
      {
        path: 'items',
        name: 'Items',
        component: () => import('../views/Items.vue'),
        meta: { title: '物品库存', roles: ['admin', 'warehouse'] }
      },
      {
        path: 'employees',
        name: 'Employees',
        component: () => import('../views/Employees.vue'),
        meta: { title: '员工管理', roles: ['admin'] }
      },
      {
        path: 'my-requests',
        name: 'MyRequests',
        component: () => import('../views/MyRequests.vue'),
        meta: { title: '我的领用' }
      },
      {
        path: 'requests',
        name: 'Requests',
        component: () => import('../views/Requests.vue'),
        meta: { title: '领用审批', roles: ['admin', 'warehouse'] }
      },
      {
        path: 'inventory',
        name: 'Inventory',
        component: () => import('../views/Inventory.vue'),
        meta: { title: '入库/归还', roles: ['admin', 'warehouse'] }
      },
      {
        path: 'inventory-logs',
        name: 'InventoryLogs',
        component: () => import('../views/InventoryLogs.vue'),
        meta: { title: '库存台账', roles: ['admin', 'warehouse'] }
      },
      {
        path: 'stats',
        name: 'Stats',
        component: () => import('../views/Stats.vue'),
        meta: { title: '数据统计', roles: ['admin'] }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../views/Settings.vue'),
        meta: { title: '系统设置', roles: ['admin'] }
      },
      {
        path: 'change-password',
        name: 'ChangePassword',
        component: () => import('../views/ChangePassword.vue'),
        meta: { title: '修改密码' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  if (to.meta.requiresAuth !== false && !userStore.token) {
    next('/login')
  } else if (to.meta.roles && !to.meta.roles.includes(userStore.user?.role)) {
    if (userStore.user?.role === 'employee') {
      next('/my-requests')
    } else {
      next('/dashboard')
    }
  } else {
    next()
  }
})

export default router
