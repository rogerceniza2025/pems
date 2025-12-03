import {
  createSignal,
  For,
  Show,
  createEffect,
  createMemo
} from 'solid-js'
import {
  NavigationService,
  NavigationRepository,
  type NavigationStatistics
} from '@pems/navigation-management'

/**
 * Navigation Analytics Dashboard
 *
 * This component provides comprehensive analytics and insights
 * for navigation usage, performance, and user behavior.
 */
interface NavigationAnalyticsProps {
  navigationService: NavigationService
  navigationRepository: NavigationRepository
  refreshInterval?: number // in milliseconds
}

interface AnalyticsData {
  // Usage metrics
  totalClicks: number
  totalViews: number
  uniqueUsers: number
  averageSessionDuration: number

  // Item analytics
  topItems: Array<{
    itemId: string
    label: string
    path: string
    clicks: number
    views: number
    clickRate: number
    averageTimeToClick: number
  }>

  // Performance metrics
  averageLoadTime: number
  cacheHitRatio: number
  errorRate: number

  // User analytics
  roleDistribution: Array<{
    role: string
    userCount: number
    averageItemsViewed: number
  }>

  // Time-based data
  hourlyActivity: Array<{
    hour: number
    clicks: number
    views: number
  }>
}

export function NavigationAnalytics(props: NavigationAnalyticsProps) {
  // UI State
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal<string>()
  const [selectedTimeRange, setSelectedTimeRange] = createSignal<'24h' | '7d' | '30d' | '90d'>('7d')
  const [selectedMetric, setSelectedMetric] = createSignal<'usage' | 'performance' | 'items' | 'users'>('usage')

  // Analytics data
  const [analyticsData, setAnalyticsData] = createSignal<AnalyticsData>()
  const [navigationStats, setNavigationStats] = createSignal<NavigationStatistics>()

  // Refresh timer
  let refreshTimer: number | undefined

  // Initialize analytics
  createEffect(async () => {
    await loadAnalytics()
  })

  // Set up refresh timer
  createEffect(() => {
    if (refreshTimer) clearInterval(refreshTimer)

    const interval = props.refreshInterval || 30000 // 30 seconds default
    refreshTimer = setInterval(loadAnalytics, interval)

    return () => {
      if (refreshTimer) clearInterval(refreshTimer)
    }
  })

  // Load analytics data
  const loadAnalytics = async () => {
    try {
      setLoading(true)
      setError()

      // Get navigation statistics
      const stats = props.navigationService.getStatistics()
      setNavigationStats(stats)

      // In a real implementation, this would fetch actual analytics data
      // For now, we'll simulate the data
      const mockData: AnalyticsData = {
        totalClicks: Math.floor(Math.random() * 10000) + 1000,
        totalViews: Math.floor(Math.random() * 50000) + 5000,
        uniqueUsers: Math.floor(Math.random() * 1000) + 100,
        averageSessionDuration: Math.floor(Math.random() * 300) + 60,

        topItems: [
          {
            itemId: 'dashboard',
            label: 'Dashboard',
            path: '/',
            clicks: Math.floor(Math.random() * 2000) + 500,
            views: Math.floor(Math.random() * 5000) + 1000,
            clickRate: Math.random() * 0.5 + 0.3,
            averageTimeToClick: Math.random() * 5000 + 1000
          },
          {
            itemId: 'users',
            label: 'Users',
            path: '/users',
            clicks: Math.floor(Math.random() * 1500) + 300,
            views: Math.floor(Math.random() * 3000) + 500,
            clickRate: Math.random() * 0.4 + 0.2,
            averageTimeToClick: Math.random() * 4000 + 1500
          },
          {
            itemId: 'transactions',
            label: 'Transactions',
            path: '/transactions',
            clicks: Math.floor(Math.random() * 1800) + 400,
            views: Math.floor(Math.random() * 4000) + 800,
            clickRate: Math.random() * 0.6 + 0.3,
            averageTimeToClick: Math.random() * 3500 + 1200
          }
        ],

        averageLoadTime: Math.random() * 100 + 20,
        cacheHitRatio: Math.random() * 0.3 + 0.7,
        errorRate: Math.random() * 0.05,

        roleDistribution: [
          { role: 'viewer', userCount: 150, averageItemsViewed: 8 },
          { role: 'clerk', userCount: 200, averageItemsViewed: 12 },
          { role: 'manager', userCount: 80, averageItemsViewed: 15 },
          { role: 'tenant_admin', userCount: 25, averageItemsViewed: 20 },
          { role: 'super_admin', userCount: 5, averageItemsViewed: 25 }
        ],

        hourlyActivity: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          clicks: Math.floor(Math.random() * 100) + 10,
          views: Math.floor(Math.random() * 500) + 50
        }))
      }

      setAnalyticsData(mockData)

    } catch (err) {
      setError('Failed to load analytics data')
      console.error('Error loading analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate derived metrics
  const overallClickRate = createMemo(() => {
    const data = analyticsData()
    if (!data || data.totalViews === 0) return 0
    return data.totalClicks / data.totalViews
  })

  const performanceScore = createMemo(() => {
    const data = analyticsData()
    if (!data) return 0

    const loadTimeScore = Math.max(0, 100 - data.averageLoadTime / 5) // Convert ms to score
    const cacheScore = data.cacheHitRatio * 100
    const errorScore = Math.max(0, 100 - data.errorRate * 1000)

    return Math.round((loadTimeScore + cacheScore + errorScore) / 3)
  })

  return (
    <div class="navigation-analytics">
      {/* Header */}
      <div class="analytics-header">
        <h2>Navigation Analytics</h2>
        <div class="analytics-controls">
          <div class="time-range-selector">
            <For each={['24h', '7d', '30d', '90d'] as const}>
              {(range) => (
                <button
                  class={`range-btn ${selectedTimeRange() === range ? 'range-btn--active' : ''}`}
                  onClick={() => setSelectedTimeRange(range)}
                >
                  {range === '24h' ? 'Last 24 Hours' :
                   range === '7d' ? 'Last 7 Days' :
                   range === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
                </button>
              )}
            </For>
          </div>
          <button class="refresh-btn" onClick={loadAnalytics} disabled={loading()}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Error State */}
      <Show when={error()}>
        <div class="error-message">
          <h3>Error Loading Analytics</h3>
          <p>{error()}</p>
        </div>
      </Show>

      {/* Loading State */}
      <Show when={loading() && !analyticsData()}>
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading analytics data...</p>
        </div>
      </Show>

      {/* Main Analytics Content */}
      <Show when={analyticsData()}>
        {/* Key Metrics */}
        <div class="key-metrics">
          <div class="metric-card metric-card--primary">
            <div class="metric-header">
              <h3>Total Clicks</h3>
              <span class="metric-icon">👆</span>
            </div>
            <div class="metric-value">{analyticsData()!.totalClicks.toLocaleString()}</div>
            <div class="metric-change positive">+12.5% from last period</div>
          </div>

          <div class="metric-card metric-card--secondary">
            <div class="metric-header">
              <h3>Unique Users</h3>
              <span class="metric-icon">👥</span>
            </div>
            <div class="metric-value">{analyticsData()!.uniqueUsers.toLocaleString()}</div>
            <div class="metric-change positive">+8.2% from last period</div>
          </div>

          <div class="metric-card metric-card--success">
            <div class="metric-header">
              <h3>Click Rate</h3>
              <span class="metric-icon">📊</span>
            </div>
            <div class="metric-value">{(overallClickRate() * 100).toFixed(1)}%</div>
            <div class="metric-change positive">+2.1% from last period</div>
          </div>

          <div class="metric-card metric-card--warning">
            <div class="metric-header">
              <h3>Performance Score</h3>
              <span class="metric-icon">⚡</span>
            </div>
            <div class="metric-value">{performanceScore()}/100</div>
            <div class="metric-change positive">+5 points from last period</div>
          </div>
        </div>

        {/* Metric Tabs */}
        <div class="analytics-tabs">
          <div class="tab-navigation">
            <For each={['usage', 'performance', 'items', 'users'] as const}>
              {(metric) => (
                <button
                  class={`tab-btn ${selectedMetric() === metric ? 'tab-btn--active' : ''}`}
                  onClick={() => setSelectedMetric(metric)}
                >
                  {metric === 'usage' ? 'Usage' :
                   metric === 'performance' ? 'Performance' :
                   metric === 'items' ? 'Top Items' : 'User Analytics'}
                </button>
              )}
            </For>
          </div>

          <div class="tab-content">
            {/* Usage Tab */}
            <Show when={selectedMetric() === 'usage'}>
              <div class="usage-analytics">
                <div class="chart-container">
                  <h3>Hourly Activity</h3>
                  <div class="activity-chart">
                    <For each={analyticsData()!.hourlyActivity}>
                      {(hourData) => (
                        <div
                          class="activity-bar"
                          style={{
                            height: `${(hourData.clicks / 100) * 100}%`,
                            opacity: hourData.clicks > 50 ? 1 : 0.6
                          }}
                          title={`${hourData.hour}:00 - ${hourData.clicks} clicks`}
                        >
                          <span class="activity-label">{hourData.hour}</span>
                        </div>
                      )}
                    </For>
                  </div>
                </div>

                <div class="usage-stats">
                  <div class="usage-stat">
                    <h4>Average Session Duration</h4>
                    <div class="usage-value">
                      {Math.floor(analyticsData()!.averageSessionDuration / 60)}m {analyticsData()!.averageSessionDuration % 60}s
                    </div>
                  </div>
                  <div class="usage-stat">
                    <h4>Total Views</h4>
                    <div class="usage-value">{analyticsData()!.totalViews.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </Show>

            {/* Performance Tab */}
            <Show when={selectedMetric() === 'performance'}>
              <div class="performance-analytics">
                <div class="performance-grid">
                  <div class="performance-metric">
                    <h4>Average Load Time</h4>
                    <div class="performance-value">{analyticsData()!.averageLoadTime.toFixed(1)}ms</div>
                    <div class="performance-bar">
                      <div
                        class="performance-fill"
                        style={{ width: `${Math.min(100, analyticsData()!.averageLoadTime / 2)}%` }}
                      />
                    </div>
                  </div>

                  <div class="performance-metric">
                    <h4>Cache Hit Ratio</h4>
                    <div class="performance-value">{(analyticsData()!.cacheHitRatio * 100).toFixed(1)}%</div>
                    <div class="performance-bar">
                      <div
                        class="performance-fill performance-fill--success"
                        style={{ width: `${analyticsData()!.cacheHitRatio * 100}%` }}
                      />
                    </div>
                  </div>

                  <div class="performance-metric">
                    <h4>Error Rate</h4>
                    <div class="performance-value">{(analyticsData()!.errorRate * 100).toFixed(2)}%</div>
                    <div class="performance-bar">
                      <div
                        class="performance-fill performance-fill--danger"
                        style={{ width: `${Math.min(100, analyticsData()!.errorRate * 1000)}%` }}
                      />
                    </div>
                  </div>

                  <Show when={navigationStats()}>
                    <div class="performance-metric">
                      <h4>Navigation Items</h4>
                      <div class="performance-value">{navigationStats()!.totalItems}</div>
                    </div>
                  </Show>
                </div>
              </div>
            </Show>

            {/* Top Items Tab */}
            <Show when={selectedMetric() === 'items'}>
              <div class="items-analytics">
                <div class="items-table">
                  <div class="table-header">
                    <div class="table-cell">Item</div>
                    <div class="table-cell">Path</div>
                    <div class="table-cell">Clicks</div>
                    <div class="table-cell">Views</div>
                    <div class="table-cell">Click Rate</div>
                    <div class="table-cell">Avg Time to Click</div>
                  </div>
                  <For each={analyticsData()!.topItems}>
                    {(item) => (
                      <div class="table-row">
                        <div class="table-cell table-cell--primary">
                          <strong>{item.label}</strong>
                        </div>
                        <div class="table-cell">{item.path}</div>
                        <div class="table-cell">{item.clicks.toLocaleString()}</div>
                        <div class="table-cell">{item.views.toLocaleString()}</div>
                        <div class="table-cell">
                          <span class={`click-rate ${item.clickRate > 0.4 ? 'click-rate--high' : item.clickRate > 0.2 ? 'click-rate--medium' : 'click-rate--low'}`}>
                            {(item.clickRate * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div class="table-cell">{(item.averageTimeToClick / 1000).toFixed(1)}s</div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* Users Tab */}
            <Show when={selectedMetric() === 'users'}>
              <div class="users-analytics">
                <div class="role-distribution">
                  <h3>Role Distribution</h3>
                  <div class="role-chart">
                    <For each={analyticsData()!.roleDistribution}>
                      {(roleData) => (
                        <div class="role-item">
                          <div class="role-info">
                            <span class="role-name">{roleData.role}</span>
                            <span class="role-count">{roleData.userCount} users</span>
                          </div>
                          <div class="role-metrics">
                            <div class="role-stat">
                              <span class="stat-label">Avg Items Viewed</span>
                              <span class="stat-value">{roleData.averageItemsViewed}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  )
}

// CSS Styles for NavigationAnalytics component
export const navigationAnalyticsStyles = `
.navigation-analytics {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.analytics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
}

.analytics-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.analytics-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.time-range-selector {
  display: flex;
  background: var(--color-background-secondary);
  border-radius: var(--border-radius);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.range-btn {
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.range-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-background-tertiary);
}

.range-btn--active {
  background: var(--color-primary);
  color: white;
}

.refresh-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.refresh-btn:hover:not(:disabled) {
  background: var(--color-background-secondary);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  background: var(--color-danger);
  color: white;
  padding: 1rem 1.5rem;
  border-radius: var(--border-radius);
  text-align: center;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem;
  color: var(--color-text-secondary);
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.key-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.metric-card {
  background: var(--color-background-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-lg);
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
}

.metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--color-primary);
}

.metric-card--primary::before { background: var(--color-primary); }
.metric-card--secondary::before { background: var(--color-secondary); }
.metric-card--success::before { background: var(--color-success); }
.metric-card--warning::before { background: var(--color-warning); }

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.metric-header h3 {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.metric-icon {
  font-size: 1.5rem;
}

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 0.5rem;
}

.metric-change {
  font-size: 0.75rem;
  font-weight: 500;
}

.metric-change.positive {
  color: var(--color-success);
}

.metric-change.negative {
  color: var(--color-danger);
}

.analytics-tabs {
  background: var(--color-background-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
}

.tab-navigation {
  display: flex;
  background: var(--color-background-secondary);
  border-bottom: 1px solid var(--color-border);
}

.tab-btn {
  flex: 1;
  padding: 1rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  position: relative;
}

.tab-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-background-tertiary);
}

.tab-btn--active {
  color: var(--color-primary);
  background: var(--color-background-primary);
}

.tab-btn--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-primary);
}

.tab-content {
  padding: 1.5rem;
}

/* Usage Analytics */
.usage-analytics {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
}

.chart-container h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 1rem 0;
}

.activity-chart {
  display: flex;
  align-items: end;
  gap: 2px;
  height: 200px;
  background: var(--color-background-secondary);
  border-radius: var(--border-radius);
  padding: 1rem;
}

.activity-bar {
  flex: 1;
  background: var(--color-primary);
  border-radius: var(--border-radius-sm) var(--border-radius-sm) 0 0;
  position: relative;
  min-height: 4px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.activity-bar:hover {
  opacity: 0.8;
}

.activity-label {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.625rem;
  color: var(--color-text-tertiary);
}

.usage-stats {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.usage-stat {
  background: var(--color-background-secondary);
  padding: 1rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--color-border);
}

.usage-stat h4 {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin: 0 0 0.5rem 0;
}

.usage-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary);
}

/* Performance Analytics */
.performance-analytics {
  width: 100%;
}

.performance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.performance-metric {
  background: var(--color-background-secondary);
  padding: 1.5rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--color-border);
}

.performance-metric h4 {
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text-primary);
  margin: 0 0 1rem 0;
}

.performance-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 1rem;
}

.performance-bar {
  height: 8px;
  background: var(--color-background-tertiary);
  border-radius: var(--border-radius-sm);
  overflow: hidden;
}

.performance-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.3s ease;
  border-radius: var(--border-radius-sm);
}

.performance-fill--success {
  background: var(--color-success);
}

.performance-fill--danger {
  background: var(--color-danger);
}

/* Items Analytics */
.items-analytics {
  width: 100%;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr 1fr 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-background-secondary);
  border-radius: var(--border-radius) var(--border-radius) 0 0;
  border: 1px solid var(--color-border);
  border-bottom: none;
  font-weight: 600;
  color: var(--color-text-primary);
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr 1fr 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-background-primary);
  border: 1px solid var(--color-border);
  border-top: none;
  align-items: center;
}

.table-row:hover {
  background: var(--color-background-secondary);
}

.table-cell {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
}

.table-cell--primary {
  font-weight: 500;
  color: var(--color-text-primary);
}

.click-rate {
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius-sm);
  font-weight: 500;
  font-size: 0.75rem;
}

.click-rate--high {
  background: var(--color-success);
  color: white;
}

.click-rate--medium {
  background: var(--color-warning);
  color: white;
}

.click-rate--low {
  background: var(--color-info);
  color: white;
}

/* Users Analytics */
.users-analytics {
  width: 100%;
}

.role-distribution h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 1.5rem 0;
}

.role-chart {
  display: grid;
  gap: 1rem;
}

.role-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--color-background-secondary);
  padding: 1rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--color-border);
}

.role-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.role-name {
  font-weight: 600;
  color: var(--color-text-primary);
  text-transform: capitalize;
}

.role-count {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.role-metrics {
  display: flex;
  gap: 2rem;
}

.role-stat {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary);
}

/* Responsive Design */
@media (max-width: 1024px) {
  .key-metrics {
    grid-template-columns: repeat(2, 1fr);
  }

  .usage-analytics {
    grid-template-columns: 1fr;
  }

  .performance-grid {
    grid-template-columns: 1fr;
  }

  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .table-row {
    padding: 1rem;
  }

  .table-cell {
    padding: 0.25rem 0;
  }

  .role-item {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .role-metrics {
    width: 100%;
    justify-content: space-around;
  }
}

@media (max-width: 768px) {
  .key-metrics {
    grid-template-columns: 1fr;
  }

  .analytics-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .time-range-selector {
    flex-wrap: wrap;
  }

  .range-btn {
    flex: 1;
    min-width: 80px;
    font-size: 0.75rem;
    padding: 0.5rem 0.75rem;
  }

  .tab-navigation {
    flex-wrap: wrap;
  }

  .tab-btn {
    flex: 1;
    min-width: 120px;
    font-size: 0.75rem;
    padding: 0.75rem 0.5rem;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
`