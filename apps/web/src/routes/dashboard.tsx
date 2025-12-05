import { createSignal, For, Show } from "solid-js";
import { createFileRoute } from "@tanstack/solid-router";
import {
  Users,
  FileText,
  TrendingUp,
  Building2,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-solid";

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const [stats, setStats] = createSignal([
    {
      title: "Total Employees",
      value: "2,847",
      change: "+12.5%",
      changeType: "increase" as const,
      icon: Users,
      color: "blue"
    },
    {
      title: "Active Contracts",
      value: "1,423",
      change: "+8.2%",
      changeType: "increase" as const,
      icon: FileText,
      color: "green"
    },
    {
      title: "Monthly Payroll",
      value: "₱45.2M",
      change: "+15.3%",
      changeType: "increase" as const,
      icon: CreditCard,
      color: "purple"
    },
    {
      title: "Departments",
      value: "47",
      change: "+2",
      changeType: "increase" as const,
      icon: Building2,
      color: "orange"
    }
  ]);

  const [recentActivities, setRecentActivities] = createSignal([
    {
      id: 1,
      type: "contract",
      title: "New contract signed",
      description: "John Doe - Senior Teacher",
      time: "2 hours ago",
      status: "success"
    },
    {
      id: 2,
      type: "payroll",
      title: "Payroll processed",
      description: "November 2024 payroll completed",
      time: "1 day ago",
      status: "success"
    },
    {
      id: 3,
      type: "alert",
      title: "Contract expiring soon",
      description: "3 contracts expiring in 30 days",
      time: "2 days ago",
      status: "warning"
    }
  ]);

  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div class="px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            Welcome back! Here's what's happening with your employment management system.
          </p>
        </div>

        {/* Stats Grid */}
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <For each={stats()}>
            {(stat) => (
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <stat.icon class={`h-8 w-8 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        {stat.title}
                      </dt>
                      <dd class="flex items-baseline">
                        <div class="text-2xl font-semibold text-gray-900 dark:text-white">
                          {stat.value}
                        </div>
                        <span
                          class={`ml-2 text-sm font-medium ${
                            stat.changeType === 'increase'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {stat.change}
                        </span>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent Activities */}
          <div class="lg:col-span-2">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Activities</h2>
              </div>
              <div class="p-6">
                <div class="space-y-4">
                  <For each={recentActivities()}>
                    {(activity) => (
                      <div class="flex items-start space-x-3">
                        <div class="flex-shrink-0">
                          <Show
                            when={activity.status === 'success'}
                            fallback={
                              <Show
                                when={activity.status === 'warning'}
                                fallback={<AlertCircle class="h-5 w-5 text-red-500" />}
                              >
                                <AlertCircle class="h-5 w-5 text-yellow-500" />
                              </Show>
                            }
                          >
                            <CheckCircle class="h-5 w-5 text-green-500" />
                          </Show>
                        </div>
                        <div class="min-w-0 flex-1">
                          <p class="text-sm font-medium text-gray-900 dark:text-white">
                            {activity.title}
                          </p>
                          <p class="text-sm text-gray-500 dark:text-gray-400">
                            {activity.description}
                          </p>
                          <p class="mt-1 text-xs text-gray-400 dark:text-gray-500 flex items-center">
                            <Clock class="h-3 w-3 mr-1" />
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div class="lg:col-span-1">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
              </div>
              <div class="p-6">
                <div class="space-y-3">
                  <button class="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <div class="flex items-center">
                      <Users class="h-4 w-4 mr-3 text-blue-600" />
                      Add New Employee
                    </div>
                  </button>
                  <button class="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <div class="flex items-center">
                      <FileText class="h-4 w-4 mr-3 text-green-600" />
                      Create Contract
                    </div>
                  </button>
                  <button class="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <div class="flex items-center">
                      <CreditCard class="h-4 w-4 mr-3 text-purple-600" />
                      Process Payroll
                    </div>
                  </button>
                  <button class="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <div class="flex items-center">
                      <TrendingUp class="h-4 w-4 mr-3 text-orange-600" />
                      Generate Reports
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}