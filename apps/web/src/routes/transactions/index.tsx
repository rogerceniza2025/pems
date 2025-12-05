import { CreditCard, Search, Filter, Plus, Download, TrendingUp, TrendingDown, DollarSign } from "lucide-solid";
import { createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute('/transactions/')({
  component: TransactionsPage,
})

function TransactionsPage() {
  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div class="px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div class="mb-8 flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Transactions</h1>
            <p class="mt-2 text-gray-600 dark:text-gray-400">
              Manage and track all financial transactions
            </p>
          </div>
          <button class="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus class="h-4 w-4 mr-2" />
            New Transaction
          </button>
        </div>

        {/* Stats Cards */}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">$124,563</p>
                <div class="flex items-center text-sm text-green-600 dark:text-green-400 mt-2">
                  <TrendingUp class="h-4 w-4 mr-1" />
                  +12.5% from last month
                </div>
              </div>
              <div class="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <DollarSign class="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Expenses</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">$47,281</p>
                <div class="flex items-center text-sm text-red-600 dark:text-red-400 mt-2">
                  <TrendingUp class="h-4 w-4 mr-1" />
                  +8.3% from last month
                </div>
              </div>
              <div class="h-12 w-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                <CreditCard class="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Net Profit</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">$77,282</p>
                <div class="flex items-center text-sm text-green-600 dark:text-green-400 mt-2">
                  <TrendingUp class="h-4 w-4 mr-1" />
                  +15.7% from last month
                </div>
              </div>
              <div class="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <TrendingUp class="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div class="p-6 border-b border-gray-200 dark:border-gray-700">
            <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div class="flex items-center gap-2 flex-1">
                <div class="relative flex-1 max-w-md">
                  <Search class="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <button class="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <Filter class="h-4 w-4" />
                </button>
                <button class="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <Download class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Transaction ID
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    #TRX001
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    Software License Subscription
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      Software
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    $299.00
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    Dec 3, 2024
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Completed
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}