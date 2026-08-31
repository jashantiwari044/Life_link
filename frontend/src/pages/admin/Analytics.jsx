import { useEffect, useState } from 'react'
import {
  Users,
  Droplets,
  CheckCircle2,
  Building2,
  Tent,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  HeartHandshake,
} from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LoadError from '../../components/LoadError.jsx'
import { adminSidebarLinks } from '../../config/sidebarLinks.js'
import { adminApi, describeError } from '../../api/index.js'

// Register Chart.js elements
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
)

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  function fetchAnalytics() {
    setLoading(true)
    setLoadError('')
    adminApi
      .getAnalytics()
      .then(setData)
      .catch((err) => setLoadError(describeError(err, 'Could not load platform analytics.')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  if (loading || loadError) {
    return (
      <DashboardLayout active="Analytics" links={adminSidebarLinks}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">
              Platform Analytics
            </h1>
            <p className="text-muted text-sm">Real-time platform metrics and live charts.</p>
          </div>
        </div>
        <LoadError message={loadError} />
        {loading && <p className="text-muted py-8">Loading analytics &amp; charts…</p>}
      </DashboardLayout>
    )
  }

  const {
    stats,
    blood_group_distribution,
    blood_bank_inventory = {},
    requests_by_urgency,
    orgs_by_type,
    monthly_trend,
  } = data

  // Chart 1: Blood Group Distribution (Doughnut)
  const bloodGroupChartData = {
    labels: Object.keys(blood_group_distribution),
    datasets: [
      {
        label: 'Registered Donors',
        data: Object.values(blood_group_distribution),
        backgroundColor: [
          '#f2467d',
          '#f5709b',
          '#fb9cb9',
          '#3b82f6',
          '#60a5fa',
          '#10b981',
          '#f59e0b',
          '#8b5cf6',
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  }

  // Chart 2: Blood Bank Inventory Levels (Bar)
  const inventoryChartData = {
    labels: Object.keys(blood_bank_inventory),
    datasets: [
      {
        label: 'Units Available in Stock',
        data: Object.values(blood_bank_inventory),
        backgroundColor: [
          '#f2467d',
          '#e0295f',
          '#fb7185',
          '#38bdf8',
          '#3b82f6',
          '#10b981',
          '#f59e0b',
          '#8b5cf6',
        ],
        borderRadius: 8,
      },
    ],
  }

  // Chart 3: Organizations by Type (Doughnut)
  const orgsChartData = {
    labels: ['Hospitals', 'Blood Banks', 'NGOs'],
    datasets: [
      {
        label: 'Active Count',
        data: [orgs_by_type.HOSPITAL || 0, orgs_by_type.BLOOD_BANK || 0, orgs_by_type.NGO || 0],
        backgroundColor: ['#3b82f6', '#f2467d', '#10b981'],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  }

  // Chart 4: Monthly Request & Fulfillment Trend (Line)
  const monthlyTrendData = {
    labels: monthly_trend.map((m) => m.month),
    datasets: [
      {
        label: 'Total Requests',
        data: monthly_trend.map((m) => m.requests),
        borderColor: '#f2467d',
        backgroundColor: 'rgba(242, 70, 125, 0.1)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#f2467d',
      },
      {
        label: 'Fulfilled Donations',
        data: monthly_trend.map((m) => m.fulfilled),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#10b981',
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' },
          usePointStyle: true,
          padding: 16,
        },
      },
    },
  }

  return (
    <DashboardLayout active="Analytics" links={adminSidebarLinks}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">
            Platform Analytics
          </h1>
          <p className="text-muted text-sm">Real-time platform activity metrics, stock levels, and live distributions.</p>
        </div>

        <button
          type="button"
          onClick={fetchAnalytics}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-white text-ink border border-line shadow-xs hover:border-pink hover:text-pink-dark transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-8">
        <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-muted text-xs font-semibold mb-1">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span>Total Users</span>
          </div>
          <p className="text-xl font-extrabold text-ink">{stats.users_count.toLocaleString()}</p>
          <p className="text-[11px] text-[#1f8a3d] font-semibold mt-0.5">{stats.donors_active_count} active donors</p>
        </div>

        <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-muted text-xs font-semibold mb-1">
            <Building2 className="w-3.5 h-3.5 text-pink-dark" />
            <span>Organizations</span>
          </div>
          <p className="text-xl font-extrabold text-ink">{stats.organizations_count}</p>
          <p className="text-[11px] text-muted font-medium mt-0.5">{stats.pending_orgs_count} pending approvals</p>
        </div>

        <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-muted text-xs font-semibold mb-1">
            <Droplets className="w-3.5 h-3.5 text-red-500" />
            <span>Bank Inventory</span>
          </div>
          <p className="text-xl font-extrabold text-ink">{stats.inventory_total_units ?? 0} units</p>
          <p className="text-[11px] text-[#1f8a3d] font-semibold mt-0.5">Across all blood banks</p>
        </div>

        <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-muted text-xs font-semibold mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1f8a3d]" />
            <span>Fulfilled Blood</span>
          </div>
          <p className="text-xl font-extrabold text-[#1f8a3d]">{stats.requests_fulfilled_count}</p>
          <p className="text-[11px] text-muted font-medium mt-0.5">
            {stats.requests_total_count > 0
              ? `${Math.round((stats.requests_fulfilled_count / stats.requests_total_count) * 100)}% completion`
              : '0% completion'}
          </p>
        </div>

        <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-muted text-xs font-semibold mb-1">
            <Tent className="w-3.5 h-3.5 text-purple-500" />
            <span>Donation Drives</span>
          </div>
          <p className="text-xl font-extrabold text-ink">{stats.camps_run_count}</p>
          <p className="text-[11px] text-muted font-medium mt-0.5">Active NGO camps</p>
        </div>

        <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-muted text-xs font-semibold mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Urgent Needs</span>
          </div>
          <p className="text-xl font-extrabold text-amber-600">
            {(requests_by_urgency.EMERGENCY || 0) + (requests_by_urgency.URGENT || 0)}
          </p>
          <p className="text-[11px] text-muted font-medium mt-0.5">Emergency / Urgent</p>
        </div>
      </div>

      {/* Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Chart 1: Blood Group Distribution */}
        <div className="bg-white border border-line rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-ink">Donor Blood Group Distribution</h2>
              <p className="text-xs text-muted">Registered donors across all 8 ABO / Rh blood groups.</p>
            </div>
          </div>
          <div className="h-[260px] relative">
            <Doughnut data={bloodGroupChartData} options={chartOptions} />
          </div>
        </div>

        {/* Chart 2: Blood Bank Inventory Levels */}
        <div className="bg-white border border-line rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-ink">Blood Bank Inventory Levels</h2>
              <p className="text-xs text-muted">Total stock of units available across all verified blood banks.</p>
            </div>
          </div>
          <div className="h-[260px] relative">
            <Bar data={inventoryChartData} options={chartOptions} />
          </div>
        </div>

        {/* Chart 3: Organizations by Type */}
        <div className="bg-white border border-line rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-ink">Active Healthcare Organizations</h2>
              <p className="text-xs text-muted">Distribution of verified hospitals, blood banks, and NGOs.</p>
            </div>
          </div>
          <div className="h-[260px] relative">
            <Doughnut data={orgsChartData} options={chartOptions} />
          </div>
        </div>

        {/* Chart 4: Monthly Request & Fulfillment Trend */}
        <div className="bg-white border border-line rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-ink">Monthly Requests &amp; Fulfillments</h2>
              <p className="text-xs text-muted">Timeline of requests raised vs successfully received blood.</p>
            </div>
          </div>
          <div className="h-[260px] relative">
            <Line data={monthlyTrendData} options={chartOptions} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
