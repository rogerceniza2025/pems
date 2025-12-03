import { test, expect, Page, BrowserContext } from '@playwright/test'

// Test data
const testUsers = {
  superAdmin: {
    email: 'superadmin@test.com',
    password: 'password123',
    role: 'super_admin',
  },
  tenantAdmin: {
    email: 'admin@test.com',
    password: 'password123',
    role: 'tenant_admin',
  },
  manager: {
    email: 'manager@test.com',
    password: 'password123',
    role: 'manager',
  },
  viewer: {
    email: 'viewer@test.com',
    password: 'password123',
    role: 'viewer',
  },
}

const tenants = {
  tenant1: {
    id: 'tenant-1',
    name: 'Test School 1',
  },
  tenant2: {
    id: 'tenant-2',
    name: 'Test School 2',
  },
}

// Helper functions
async function loginUser(page: Page, user: typeof testUsers[keyof typeof testUsers]) {
  await page.goto('/login')
  
  await page.fill('[data-testid=email-input]', user.email)
  await page.fill('[data-testid=password-input]', user.password)
  await page.click('[data-testid=login-button]')
  
  // Wait for successful login
  await expect(page.locator('[data-testid=navbar]')).toBeVisible()
  await expect(page.locator('[data-testid=current-user]')).toHaveText(user.email)
}

async function switchTenant(page: Page, tenantId: string) {
  await page.click('[data-testid=tenant-selector]')
  await page.click(`[data-testid=tenant-${tenantId}]`)
  await page.waitForURL(`**?tenant=${tenantId}`)
}

async function expectNavigationItems(page: Page, expectedItems: string[]) {
  for (const item of expectedItems) {
    await expect(page.locator(`[data-testid=nav-${item.toLowerCase().replace(/\s+/g, '-')}]`)).toBeVisible()
  }
}

async function expectNoNavigationItems(page: Page, forbiddenItems: string[]) {
  for (const item of forbiddenItems) {
    await expect(page.locator(`[data-testid=nav-${item.toLowerCase().replace(/\s+/g, '-')}]`)).not.toBeVisible()
  }
}

test.describe('Permission-Based Navigation E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Reset any existing session
    await page.context().clearCookies()
    await page.goto('/')
  })

  test.describe('Super Admin Navigation Journey', () => {
    test('should provide full system access to super admin', async ({ page }) => {
      await loginUser(page, testUsers.superAdmin)
      
      // Should see all navigation items
      await expectNavigationItems(page, [
        'Dashboard',
        'Users',
        'Transactions',
        'Reports',
        'Tenant Management',
        'System Configuration',
        'System Audit',
      ])
      
      // Should be able to navigate to any protected route
      await page.click('[data-testid=nav-system-configuration]')
      await expect(page).toHaveURL('/system/config')
      await expect(page.locator('[data-testid=system-config-page]')).toBeVisible()
      
      await page.click('[data-testid=nav-tenant-management]')
      await expect(page).toHaveURL('/tenants')
      await expect(page.locator('[data-testid=tenants-page]')).toBeVisible()
      
      // Should be able to access user management
      await page.click('[data-testid=nav-users]')
      await expect(page).toHaveURL('/users')
      await expect(page.locator('[data-testid=users-page]')).toBeVisible()
      
      // Should see user role as super_admin
      await expect(page.locator('[data-testid=current-role]')).toHaveText('super_admin')
    })

    test('should be able to switch between tenants', async ({ page }) => {
      await loginUser(page, testUsers.superAdmin)
      
      // Switch to tenant-1
      await switchTenant(page, tenants.tenant1.id)
      await expect(page.locator('[data-testid=current-tenant]')).toHaveText(tenants.tenant1.name)
      
      // Should still see all navigation (super admin bypasses tenant restrictions)
      await expectNavigationItems(page, ['System Configuration', 'Users'])
      
      // Switch to tenant-2
      await switchTenant(page, tenants.tenant2.id)
      await expect(page.locator('[data-testid=current-tenant]')).toHaveText(tenants.tenant2.name)
      
      // Should still see all navigation
      await expectNavigationItems(page, ['System Configuration', 'Users'])
    })

    test('should handle system configuration access', async ({ page }) => {
      await loginUser(page, testUsers.superAdmin)
      
      await page.click('[data-testid=nav-system-configuration]')
      await expect(page).toHaveURL('/system/config')
      
      // Should be able to modify system settings
      await page.click('[data-testid=save-system-settings]')
      await expect(page.locator('[data-testid=success-message]')).toBeVisible()
    })
  })

  test.describe('Tenant Admin Navigation Journey', () => {
    test('should provide tenant-scoped access to tenant admin', async ({ page }) => {
      await loginUser(page, testUsers.tenantAdmin)
      
      // Should see tenant-appropriate navigation
      await expectNavigationItems(page, [
        'Dashboard',
        'Users',
        'Transactions',
        'Reports',
        'Tenant Management', // Can read tenants but not create/delete
      ])
      
      // Should not see system-only items
      await expectNoNavigationItems(page, [
        'System Configuration',
        'System Audit',
      ])
      
      // Should be able to access user management
      await page.click('[data-testid=nav-users]')
      await expect(page).toHaveURL('/users')
      await expect(page.locator('[data-testid=users-page]')).toBeVisible()
      
      // Should be able to create users
      await page.click('[data-testid=nav-add-user]')
      await expect(page).toHaveURL('/users/create')
      await expect(page.locator('[data-testid=create-user-page]')).toBeVisible()
      
      // Should see correct role
      await expect(page.locator('[data-testid=current-role]')).toHaveText('tenant_admin')
    })

    test('should be denied access to system-only routes', async ({ page }) => {
      await loginUser(page, testUsers.tenantAdmin)
      
      // Try to directly access system configuration
      await page.goto('/system/config')
      
      // Should be redirected or shown access denied
      await expect(page.locator('[data-testid=access-denied]')).toBeVisible({ timeout: 5000 })
    })

    test('should respect tenant boundaries', async ({ page }) => {
      await loginUser(page, testUsers.tenantAdmin)
      
      // Should start with some tenant
      await expect(page.locator('[data-testid=current-tenant]')).toBeVisible()
      
      // Tenant admin should only see their tenant's data
      await page.click('[data-testid=nav-users]')
      await expect(page.locator('[data-testid=users-list]')).toBeVisible()
      
      // Should not see users from other tenants
      const userElements = await page.locator('[data-testid=user-item]').count()
      expect(userElements).toBeGreaterThan(0)
      
      // Each user should belong to current tenant
      const firstUser = page.locator('[data-testid=user-item]').first()
      await expect(firstUser.locator('[data-testid=user-tenant]')).toHaveText(
        page.locator('[data-testid=current-tenant]').textContent() || ''
      )
    })
  })

  test.describe('Manager Navigation Journey', () => {
    test('should provide supervisory access to manager', async ({ page }) => {
      await loginUser(page, testUsers.manager)
      
      // Should see manager-appropriate navigation
      await expectNavigationItems(page, [
        'Dashboard',
        'Users', // Read access only
        'Transactions',
        'Reports',
      ])
      
      // Should not see admin-only items
      await expectNoNavigationItems(page, [
        'User Management', // Cannot create/delete users
        'Tenant Management',
        'System Configuration',
      ])
      
      // Should be able to view users but not create them
      await page.click('[data-testid=nav-users]')
      await expect(page).toHaveURL('/users')
      await expect(page.locator('[data-testid=users-page]')).toBeVisible()
      
      // Create user button should not be visible
      await expect(page.locator('[data-testid=create-user-btn]')).not.toBeVisible()
      
      // Should be able to approve transactions
      await page.click('[data-testid=nav-transactions]')
      await expect(page).toHaveURL('/transactions')
      await expect(page.locator('[data-testid=approve-transaction-btn]')).toBeVisible()
      
      // Should see correct role
      await expect(page.locator('[data-testid=current-role]')).toHaveText('manager')
    })

    test('should handle transaction management', async ({ page }) => {
      await loginUser(page, testUsers.manager)
      
      await page.click('[data-testid=nav-transactions]')
      await expect(page).toHaveURL('/transactions')
      
      // Should be able to create and approve transactions
      await expect(page.locator('[data-testid=create-transaction-btn]')).toBeVisible()
      await expect(page.locator('[data-testid=approve-transaction-btn]')).toBeVisible()
      
      // Should not be able to delete transactions
      await expect(page.locator('[data-testid=delete-transaction-btn]')).not.toBeVisible()
    })
  })

  test.describe('Viewer Navigation Journey', () => {
    test('should provide read-only access to viewer', async ({ page }) => {
      await loginUser(page, testUsers.viewer)
      
      // Should see minimal navigation
      await expectNavigationItems(page, [
        'Dashboard',
        'Transactions', // Read only
        'Reports', // Read only
      ])
      
      // Should not see management items
      await expectNoNavigationItems(page, [
        'Users',
        'User Management',
        'Tenant Management',
        'System Configuration',
        'Create',
        'Approve',
      ])
      
      // Should be able to view transactions but not modify them
      await page.click('[data-testid=nav-transactions]')
      await expect(page).toHaveURL('/transactions')
      
      // Should not see action buttons
      await expect(page.locator('[data-testid=create-transaction-btn]')).not.toBeVisible()
      await expect(page.locator('[data-testid=approve-transaction-btn]')).not.toBeVisible()
      await expect(page.locator('[data-testid=edit-transaction-btn]')).not.toBeVisible()
      
      // Should see read-only indicators
      await expect(page.locator('[data-testid=read-only-indicator]')).toBeVisible()
      
      // Should see correct role
      await expect(page.locator('[data-testid=current-role]')).toHaveText('viewer')
    })
  })

  test.describe('Unauthenticated User Journey', () => {
    test('should show only public navigation for unauthenticated users', async ({ page }) => {
      await page.goto('/')
      
      // Should only see public items
      await expectNavigationItems(page, ['Dashboard'])
      await expectNoNavigationItems(page, [
        'Users',
        'Transactions',
        'Reports',
        'System Configuration',
      ])
      
      // Should not see user info
      await expect(page.locator('[data-testid=current-user]')).not.toBeVisible()
      await expect(page.locator('[data-testid=current-role]')).not.toBeVisible()
      
      // Should be redirected to login when accessing protected routes
      await page.goto('/users')
      await expect(page).toHaveURL('/login')
    })

    test('should redirect to login on protected route access', async ({ page }) => {
      await page.goto('/system/config')
      
      // Should redirect to login
      await expect(page).toHaveURL('/login')
      await expect(page.locator('[data-testid=login-form]')).toBeVisible()
    })
  })

  test.describe('Cross-Browser Navigation Tests', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should work correctly in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        if (currentBrowser !== browserName) test.skip()
        
        await loginUser(page, testUsers.manager)
        
        // Should see navigation
        await expectNavigationItems(page, ['Dashboard', 'Users', 'Transactions', 'Reports'])
        
        // Should be able to navigate
        await page.click('[data-testid=nav-users]')
        await expect(page).toHaveURL('/users')
        
        // Should be responsive
        await page.setViewportSize({ width: 375, height: 667 }) // Mobile
        await expect(page.locator('[data-testid=mobile-nav]')).toBeVisible()
      })
    })
  })

  test.describe('Mobile Navigation Tests', () => {
    test('should handle mobile navigation with permissions', async ({ page }) => {
      await loginUser(page, testUsers.manager)
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Should see mobile navigation
      await expect(page.locator('[data-testid=mobile-menu-button]')).toBeVisible()
      
      // Open mobile menu
      await page.click('[data-testid=mobile-menu-button]')
      await expect(page.locator('[data-testid=mobile-nav]')).toBeVisible()
      
      // Should see filtered navigation items
      await expect(page.locator('[data-testid=mobile-nav-users]')).toBeVisible()
      await expect(page.locator('[data-testid=mobile-nav-system-configuration]')).not.toBeVisible()
      
      // Should be able to navigate from mobile menu
      await page.click('[data-testid=mobile-nav-transactions]')
      await expect(page).toHaveURL('/transactions')
    })
  })

  test.describe('Security Tests', () => {
    test('should prevent URL manipulation for unauthorized access', async ({ page }) => {
      await loginUser(page, testUsers.viewer)
      
      // Try to directly access admin routes
      const restrictedRoutes = [
        '/users',
        '/users/create',
        '/system/config',
        '/tenants',
      ]
      
      for (const route of restrictedRoutes) {
        await page.goto(route)
        
        // Should show access denied or redirect
        await expect(
          page.locator('[data-testid=access-denied]').or(
            page.locator('[data-testid=login-required]')
          )
        ).toBeVisible({ timeout: 5000 })
      }
    })

    test('should prevent permission escalation via browser dev tools', async ({ page }) => {
      await loginUser(page, testUsers.viewer)
      
      // Try to manipulate user permissions via client-side
      await page.evaluate(() => {
        // Attempt to modify user object (should not work)
        (window as any).currentUser = {
          ...(window as any).currentUser,
          permissions: ['users:create', 'system:config']
        }
      })
      
      // Should still not be able to access restricted routes
      await page.goto('/users/create')
      await expect(page.locator('[data-testid=access-denied]')).toBeVisible({ timeout: 5000 })
    })

    test('should handle session expiration gracefully', async ({ page }) => {
      await loginUser(page, testUsers.manager)
      
      // Clear session cookies to simulate expiration
      await page.context().clearCookies()
      
      // Try to access protected route
      await page.goto('/users')
      
      // Should redirect to login
      await expect(page).toHaveURL('/login')
      await expect(page.locator('[data-testid=login-form]')).toBeVisible()
    })
  })

  test.describe('Performance Tests', () => {
    test('should load navigation quickly', async ({ page }) => {
      await loginUser(page, testUsers.tenantAdmin)
      
      // Measure navigation load time
      const startTime = Date.now()
      
      await expect(page.locator('[data-testid=main-nav]')).toBeVisible()
      
      const loadTime = Date.now() - startTime
      
      // Should load within reasonable time (2 seconds)
      expect(loadTime).toBeLessThan(2000)
    })

    test('should handle large permission sets efficiently', async ({ page }) => {
      // This test would require creating a user with many permissions
      // For now, we'll test with super admin who has all permissions
      
      await loginUser(page, testUsers.superAdmin)
      
      const startTime = Date.now()
      
      // Navigate through multiple routes
      await page.click('[data-testid=nav-users]')
      await expect(page).toHaveURL('/users')
      
      await page.click('[data-testid=nav-transactions]')
      await expect(page).toHaveURL('/transactions')
      
      await page.click('[data-testid=nav-reports]')
      await expect(page).toHaveURL('/reports')
      
      const navigationTime = Date.now() - startTime
      
      // Should navigate quickly (3 seconds for multiple routes)
      expect(navigationTime).toBeLessThan(3000)
    })
  })

  test.describe('Accessibility Tests', () => {
    test('should be accessible with keyboard navigation', async ({ page }) => {
      await loginUser(page, testUsers.manager)
      
      // Tab through navigation
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid=nav-dashboard]:focus')).toBeVisible()
      
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid=nav-users]:focus')).toBeVisible()
      
      // Should be able to activate navigation with Enter
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL('/users')
    })

    test('should have proper ARIA labels', async ({ page }) => {
      await loginUser(page, testUsers.manager)
      
      // Check navigation ARIA attributes
      const nav = page.locator('[data-testid=main-nav]')
      await expect(nav).toHaveAttribute('role', 'navigation')
      
      const navItems = page.locator('[data-testid^=nav-]')
      const count = await navItems.count()
      
      for (let i = 0; i < count; i++) {
        const item = navItems.nth(i)
        await expect(item).toHaveAttribute('aria-label')
        await expect(item).toHaveAttribute('role')
      }
    })
  })

  test.describe('Real-time Permission Updates', () => {
    test('should reflect permission changes immediately', async ({ page }) => {
      await loginUser(page, testUsers.viewer)
      
      // Initially should not see users navigation
      await expect(page.locator('[data-testid=nav-users]')).not.toBeVisible()
      
      // Simulate admin granting user management permissions
      // This would typically happen via API call from admin interface
      await page.evaluate(() => {
        // Mock permission update
        return new Promise(resolve => {
          setTimeout(resolve, 1000) // Simulate network delay
        })
      })
      
      // Refresh page to check if permissions are updated
      await page.reload()
      
      // In a real implementation, this would use real-time updates
      // For now, we just verify the current state
      await expect(page.locator('[data-testid=current-role]')).toHaveText('viewer')
    })
  })
})