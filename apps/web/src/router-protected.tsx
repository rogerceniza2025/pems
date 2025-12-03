import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
} from '@tanstack/solid-router'
import { Show } from 'solid-js'
import App from './App'
import { PermissionGuard } from './components'
import { usePermissionContext } from './contexts/PermissionContext'

// Import route components (these would be created separately)
// import Dashboard from './routes/dashboard'
// import Users from './routes/users'
// import UserCreate from './routes/users/create'
// import Transactions from './routes/transactions'
// import Reports from './routes/reports'
// import SystemConfig from './routes/system/config'
// import Login from './routes/login'

// Temporary placeholder components for demo
const Dashboard = () => <div class="p-6"><h1>Dashboard</h1><p>Welcome to PEMS Dashboard</p></div>
const Users = () => <div class="p-6"><h1>Users</h1><p>User Management</p></div>
const UserCreate = () => <div class="p-6"><h1>Create User</h1><p>Create new user</p></div>
const Transactions = () => <div class="p-6"><h1>Transactions</h1><p>Transaction Management</p></div>
const Reports = () => <div class="p-6"><h1>Reports</h1><p>Reports and Analytics</p></div>
const SystemConfig = () => <div class="p-6"><h1>System Configuration</h1><p>System Settings</p></div>
const Tenants = () => <div class="p-6"><h1>Tenants</h1><p>Tenant Management</p></div>
const Login = () => <div class="p-6"><h1>Login</h1><p>Please login to continue</p></div>

/**
 * Protected Route Component
 * A wrapper that protects routes based on permissions
 */
interface ProtectedRouteProps {
  component: () => any
  permissions?: string[]
  requireAll?: boolean
  redirectTo?: string
  fallback?: () => any
}

const ProtectedRoute: ProtectedRouteProps = (props) => {
  const { user } = usePermissionContext()
  
  return (
    <PermissionGuard
      permissions={props.permissions as any[]}
      requireAll={props.requireAll}
      redirectTo={props.redirectTo}
      fallback={props.fallback}
    >
      <props.component />
    </PermissionGuard>
  )
}

// Create a root route with layout
const rootRoute = createRootRoute({
  component: () => <App />,
})

// Authentication routes
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => <Login />,
})

// Dashboard route (public)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <Dashboard />,
})

// User management routes
const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users',
  component: () => (
    <ProtectedRoute
      component={Users}
      permissions={['users:read']}
    />
  ),
})

const usersCreateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users/create',
  component: () => (
    <ProtectedRoute
      component={UserCreate}
      permissions={['users:create']}
    />
  ),
})

// Transaction routes
const transactionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/transactions',
  component: () => (
    <ProtectedRoute
      component={Transactions}
      permissions={['transactions:read']}
    />
  ),
})

// Reports routes
const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports',
  component: () => (
    <ProtectedRoute
      component={Reports}
      permissions={['reports:read']}
    />
  ),
})

// Tenant routes
const tenantsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tenants',
  component: () => (
    <ProtectedRoute
      component={Tenants}
      permissions={['tenants:read']}
    />
  ),
})

// System routes (admin only)
const systemConfigRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/system/config',
  component: () => (
    <ProtectedRoute
      component={SystemConfig}
      permissions={['system:config']}
    />
  ),
})

// Create the router with protected routes
const router = createRouter({
  routeTree: rootRoute.addChildren([
    loginRoute,
    indexRoute,
    usersRoute,
    usersCreateRoute,
    transactionsRoute,
    reportsRoute,
    tenantsRoute,
    systemConfigRoute,
  ]),
  defaultPreload: 'intent' as const,
})

// Add route guards
router.routeGuard({
  beforeLoad: async ({ context, location }) => {
    // In a real implementation, this would get the user from session/cookies
    const user = context?.user
    
    // Check if route is public
    const publicRoutes = ['/login', '/']
    if (publicRoutes.includes(location.pathname)) {
      return
    }
    
    // Redirect to login if not authenticated
    if (!user) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.pathname,
        },
      })
    }
    
    // Permission checks will be handled by the ProtectedRoute components
  },
})

export default router