import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  HeartHandshake,
  Calendar,
  Search,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  Phone,
  MapPin,
  FlaskConical,
} from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LoadError from '../../components/LoadError.jsx'
import { adminSidebarLinks } from '../../config/sidebarLinks.js'
import { adminApi, describeError } from '../../api/index.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const tabs = ['Hospital Performance', 'Blood Bank Inventory', 'NGO Activity', 'Monthly Activity']

export default function Reports() {
  const [tab, setTab] = useState(tabs[0])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')

  function loadReports() {
    setLoading(true)
    setLoadError('')
    adminApi
      .getAnalytics()
      .then(setData)
      .catch((err) => setLoadError(describeError(err, 'Could not load reporting data.')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadReports()
  }, [])

  const filteredHospitals = useMemo(() => {
    if (!data?.hospital_performance) return []
    const q = search.trim().toLowerCase()
    if (!q) return data.hospital_performance
    return data.hospital_performance.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.poc_name.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q)
    )
  }, [data, search])

  const filteredBloodBanks = useMemo(() => {
    if (!data?.blood_bank_performance) return []
    const q = search.trim().toLowerCase()
    if (!q) return data.blood_bank_performance
    return data.blood_bank_performance.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.poc_name.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q)
    )
  }, [data, search])

  const filteredNgos = useMemo(() => {
    if (!data?.ngo_activity) return []
    const q = search.trim().toLowerCase()
    if (!q) return data.ngo_activity
    return data.ngo_activity.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        n.poc_name.toLowerCase().includes(q) ||
        n.address.toLowerCase().includes(q)
    )
  }, [data, search])

  const monthlyChartData = useMemo(() => {
    if (!data?.monthly_trend) return null
    return {
      labels: data.monthly_trend.map((m) => m.month),
      datasets: [
        {
          label: 'Requests Raised',
          data: data.monthly_trend.map((m) => m.requests),
          backgroundColor: '#f2467d',
          borderRadius: 6,
        },
        {
          label: 'Fulfilled Requests',
          data: data.monthly_trend.map((m) => m.fulfilled),
          backgroundColor: '#10b981',
          borderRadius: 6,
        },
      ],
    }
  }, [data])

  return (
    <DashboardLayout active="Reports" links={adminSidebarLinks}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">
            Platform Reports
          </h1>
          <p className="text-muted text-sm">
            Operational activity, inventory metrics, and performance across hospitals, blood banks, and NGOs.
          </p>
        </div>

        <button
          type="button"
          onClick={loadReports}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-white text-ink border border-line shadow-xs hover:border-pink hover:text-pink-dark transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      <LoadError message={loadError} />

      {/* Tab Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mb-6 gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t)
                setSearch('')
              }}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-all shadow-xs shrink-0 ${
                tab === t
                  ? 'bg-pink text-white shadow-pink/20'
                  : 'bg-white text-ink border border-line hover:border-pink/40'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab !== 'Monthly Activity' && (
          <div className="relative w-full sm:w-[260px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder={`Search ${
                tab === 'Hospital Performance'
                  ? 'hospitals'
                  : tab === 'Blood Bank Inventory'
                  ? 'blood banks'
                  : 'NGOs'
              }…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-line rounded-full pl-9 pr-4 py-2 text-xs font-medium text-ink placeholder:text-muted focus:outline-none focus:border-pink transition-all shadow-xs"
            />
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-muted py-8">Loading reports data…</p>
      ) : !data ? null : (
        <>
          {/* Tab 1: Hospital Performance */}
          {tab === 'Hospital Performance' && (
            <div>
              {/* Mobile Cards View */}
              <div className="grid grid-cols-1 gap-3.5 md:hidden">
                {filteredHospitals.length === 0 ? (
                  <div className="bg-white border border-line rounded-2xl p-6 text-center text-muted text-xs shadow-xs">
                    No hospital activity recorded yet.
                  </div>
                ) : (
                  filteredHospitals.map((h) => {
                    const rate =
                      h.requests_count > 0 ? Math.round((h.fulfilled_count / h.requests_count) * 100) : 0
                    return (
                      <div key={h.id} className="bg-white border border-line rounded-2xl p-4 shadow-xs flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-ink text-sm truncate">{h.name}</p>
                            <p className="text-muted text-[11px] flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="w-3 h-3 text-pink-dark shrink-0" />
                              <span className="truncate">{h.address}</span>
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-line">
                            <p className="text-muted text-[11px] font-semibold">Requests Raised</p>
                            <p className="font-extrabold text-ink text-base">{h.requests_count}</p>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-line">
                            <p className="text-muted text-[11px] font-semibold">Fulfilled</p>
                            <p className="font-extrabold text-[#1f8a3d] text-base">{h.fulfilled_count}</p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div className="bg-[#1f8a3d] h-full rounded-full" style={{ width: `${rate}%` }} />
                            </div>
                            <span className="text-xs font-bold text-slate-700">{rate}%</span>
                          </div>
                          <p className="text-[11px] text-muted flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{h.poc_contact}</span>
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto bg-white border border-line rounded-2xl shadow-xs">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line text-muted text-xs uppercase tracking-[0.4px]">
                      <th className="text-left px-5 py-3.5">Hospital</th>
                      <th className="text-left px-5 py-3.5">Point of Contact</th>
                      <th className="text-left px-5 py-3.5">Requests Raised</th>
                      <th className="text-left px-5 py-3.5">Fulfilled</th>
                      <th className="text-left px-5 py-3.5">Fulfillment Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHospitals.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-muted text-xs">
                          No hospital activity recorded yet.
                        </td>
                      </tr>
                    ) : (
                      filteredHospitals.map((h) => {
                        const rate =
                          h.requests_count > 0 ? Math.round((h.fulfilled_count / h.requests_count) * 100) : 0
                        return (
                          <tr key={h.id} className="border-b border-line last:border-b-0 hover:bg-slate-50/70 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                  <Building2 className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-bold text-ink text-sm">{h.name}</p>
                                  <p className="text-muted text-[11px] flex items-center gap-1">
                                    <MapPin className="w-2.5 h-2.5" />
                                    <span className="truncate max-w-[220px]">{h.address}</span>
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="text-xs font-semibold text-slate-700">{h.poc_name}</p>
                              <p className="text-[11px] text-muted flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5" />
                                <span>{h.poc_contact}</span>
                              </p>
                            </td>
                            <td className="px-5 py-3.5 font-bold text-ink">{h.requests_count}</td>
                            <td className="px-5 py-3.5 font-bold text-[#1f8a3d]">{h.fulfilled_count}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                                  <div className="bg-[#1f8a3d] h-full rounded-full" style={{ width: `${rate}%` }} />
                                </div>
                                <span className="text-xs font-bold text-slate-700">{rate}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Blood Bank Inventory */}
          {tab === 'Blood Bank Inventory' && (
            <div>
              {/* Mobile Cards View */}
              <div className="grid grid-cols-1 gap-3.5 md:hidden">
                {filteredBloodBanks.length === 0 ? (
                  <div className="bg-white border border-line rounded-2xl p-6 text-center text-muted text-xs shadow-xs">
                    No blood bank activity recorded yet.
                  </div>
                ) : (
                  filteredBloodBanks.map((bb) => (
                    <div key={bb.id} className="bg-white border border-line rounded-2xl p-4 shadow-xs flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-pink-light text-pink-dark flex items-center justify-center font-bold text-xs shrink-0">
                          <FlaskConical className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-ink text-sm truncate">{bb.name}</p>
                          <p className="text-muted text-[11px] flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="w-3 h-3 text-pink-dark shrink-0" />
                            <span className="truncate">{bb.address}</span>
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-line">
                          <p className="text-muted text-[11px] font-semibold">Total Stock Units</p>
                          <p className="font-extrabold text-pink-dark text-base">{bb.total_units} units</p>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-line">
                          <p className="text-muted text-[11px] font-semibold">Fulfillments</p>
                          <p className="font-extrabold text-[#1f8a3d] text-base">{bb.fulfillments_count}</p>
                        </div>
                      </div>

                      {/* Connected Hospitals */}
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[11px] text-muted font-semibold mb-1.5">Connected Hospitals</p>
                        {bb.linked_hospitals && bb.linked_hospitals.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {bb.linked_hospitals.map((h) => (
                              <span
                                key={h.id}
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/80"
                              >
                                <Building2 className="w-3 h-3 text-blue-500 shrink-0" />
                                <span>{h.name}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted font-medium italic">No connected hospital</span>
                        )}
                      </div>

                      {/* Blood Group Breakdown */}
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[11px] text-muted font-semibold mb-1.5">Stock by Blood Group</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(bb.inventory_breakdown || {}).map(([bg, count]) => (
                            <span
                              key={bg}
                              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border ${
                                count > 0 ? 'bg-pink-light text-pink-dark border-pink/30' : 'bg-slate-50 text-slate-400 border-slate-200'
                              }`}
                            >
                              {bg}: {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto bg-white border border-line rounded-2xl shadow-xs">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line text-muted text-xs uppercase tracking-[0.4px]">
                      <th className="text-left px-5 py-3.5">Blood Bank</th>
                      <th className="text-left px-5 py-3.5">Point of Contact</th>
                      <th className="text-left px-5 py-3.5">Total Stock Units</th>
                      <th className="text-left px-5 py-3.5">Connected Hospitals</th>
                      <th className="text-left px-5 py-3.5">Fulfillments</th>
                      <th className="text-left px-5 py-3.5">Inventory Breakdown</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBloodBanks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-muted text-xs">
                          No blood bank activity recorded yet.
                        </td>
                      </tr>
                    ) : (
                      filteredBloodBanks.map((bb) => (
                        <tr key={bb.id} className="border-b border-line last:border-b-0 hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-pink-light text-pink-dark flex items-center justify-center font-bold text-xs shrink-0">
                                <FlaskConical className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-bold text-ink text-sm">{bb.name}</p>
                                <p className="text-muted text-[11px] flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5" />
                                  <span className="truncate max-w-[200px]">{bb.address}</span>
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="text-xs font-semibold text-slate-700">{bb.poc_name}</p>
                            <p className="text-[11px] text-muted flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5" />
                              <span>{bb.poc_contact}</span>
                            </p>
                          </td>
                          <td className="px-5 py-3.5 font-extrabold text-pink-dark text-base">
                            {bb.total_units} <span className="text-xs font-semibold text-muted">units</span>
                          </td>
                          <td className="px-5 py-3.5">
                            {bb.linked_hospitals && bb.linked_hospitals.length > 0 ? (
                              <div className="flex flex-col gap-1 max-w-[200px]">
                                {bb.linked_hospitals.map((h) => (
                                  <span
                                    key={h.id}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/80 w-fit"
                                  >
                                    <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                    <span className="truncate">{h.name}</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted font-medium italic">No connected hospital</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-[#1f8a3d]">{bb.fulfillments_count} fulfilled</td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-wrap gap-1 max-w-[260px]">
                              {Object.entries(bb.inventory_breakdown || {}).map(([bg, count]) => (
                                <span
                                  key={bg}
                                  className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border ${
                                    count > 0 ? 'bg-pink-light text-pink-dark border-pink/30' : 'bg-slate-50 text-slate-400 border-slate-200'
                                  }`}
                                >
                                  {bg}: {count}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: NGO Activity */}
          {tab === 'NGO Activity' && (
            <div>
              {/* Mobile Cards View */}
              <div className="grid grid-cols-1 gap-3.5 md:hidden">
                {filteredNgos.length === 0 ? (
                  <div className="bg-white border border-line rounded-2xl p-6 text-center text-muted text-xs shadow-xs">
                    No NGO activity recorded yet.
                  </div>
                ) : (
                  filteredNgos.map((ngo) => (
                    <div key={ngo.id} className="bg-white border border-line rounded-2xl p-4 shadow-xs flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-pink-light text-pink-dark flex items-center justify-center font-bold text-xs shrink-0">
                          <HeartHandshake className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-ink text-sm truncate">{ngo.name}</p>
                          <p className="text-muted text-[11px] flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="w-3 h-3 text-pink-dark shrink-0" />
                            <span className="truncate">{ngo.address}</span>
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-line">
                          <p className="text-muted text-[11px] font-semibold">Drives Published</p>
                          <p className="font-extrabold text-purple-700 text-base">{ngo.drives_count}</p>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-line">
                          <p className="text-muted text-[11px] font-semibold">Responses</p>
                          <p className="font-extrabold text-pink-dark text-base">{ngo.responses_count}</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-bold px-2.5 py-0.5 rounded-full bg-[#e3f5e8] text-[#1f8a3d] border border-green-200">
                          Active Partner
                        </span>
                        <p className="text-[11px] text-muted flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{ngo.poc_contact}</span>
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto bg-white border border-line rounded-2xl shadow-xs">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line text-muted text-xs uppercase tracking-[0.4px]">
                      <th className="text-left px-5 py-3.5">NGO Organization</th>
                      <th className="text-left px-5 py-3.5">Point of Contact</th>
                      <th className="text-left px-5 py-3.5">Drives Published</th>
                      <th className="text-left px-5 py-3.5">Community Responses</th>
                      <th className="text-left px-5 py-3.5">Activity Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNgos.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-muted text-xs">
                          No NGO activity recorded yet.
                        </td>
                      </tr>
                    ) : (
                      filteredNgos.map((ngo) => (
                        <tr key={ngo.id} className="border-b border-line last:border-b-0 hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-pink-light text-pink-dark flex items-center justify-center font-bold text-xs shrink-0">
                                <HeartHandshake className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-bold text-ink text-sm">{ngo.name}</p>
                                <p className="text-muted text-[11px] flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5" />
                                  <span className="truncate max-w-[220px]">{ngo.address}</span>
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="text-xs font-semibold text-slate-700">{ngo.poc_name}</p>
                            <p className="text-[11px] text-muted flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5" />
                              <span>{ngo.poc_contact}</span>
                            </p>
                          </td>
                          <td className="px-5 py-3.5 font-bold text-purple-700">{ngo.drives_count} drive(s)</td>
                          <td className="px-5 py-3.5 font-bold text-pink-dark">{ngo.responses_count} response(s)</td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#e3f5e8] text-[#1f8a3d] border border-green-200">
                              Active Partner
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4: Monthly Activity */}
          {tab === 'Monthly Activity' && (
            <div className="flex flex-col gap-6">
              {monthlyChartData && (
                <div className="bg-white border border-line rounded-2xl p-4 sm:p-6 shadow-xs">
                  <h2 className="text-base font-bold text-ink mb-1">Monthly Demand vs Fulfillment</h2>
                  <p className="text-xs text-muted mb-4">Total requests raised versus successfully delivered blood units.</p>
                  <div className="h-[220px] sm:h-[260px] relative">
                    <Bar
                      data={monthlyChartData}
                      options={{
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
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Mobile Cards for Monthly */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {data.monthly_trend.map((m) => {
                  const rate = m.requests > 0 ? Math.round((m.fulfilled / m.requests) * 100) : 0
                  return (
                    <div key={m.month} className="bg-white border border-line rounded-2xl p-4 shadow-xs flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-ink text-sm">{m.month}</span>
                        <span className="text-xs font-extrabold text-[#1f8a3d]">{rate}% fulfilled</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div className="bg-slate-50 p-2 rounded-xl border border-line">
                          <p className="text-muted text-[10px] font-semibold">Total Requests</p>
                          <p className="font-extrabold text-ink">{m.requests}</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-line">
                          <p className="text-muted text-[10px] font-semibold">Fulfilled Requests</p>
                          <p className="font-extrabold text-[#1f8a3d]">{m.fulfilled}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop Table for Monthly */}
              <div className="hidden md:block overflow-x-auto bg-white border border-line rounded-2xl shadow-xs">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line text-muted text-xs uppercase tracking-[0.4px]">
                      <th className="text-left px-5 py-3.5">Month</th>
                      <th className="text-left px-5 py-3.5">Total Blood Requests</th>
                      <th className="text-left px-5 py-3.5">Fulfilled Requests</th>
                      <th className="text-left px-5 py-3.5">Fulfillment Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthly_trend.map((m) => {
                      const rate = m.requests > 0 ? Math.round((m.fulfilled / m.requests) * 100) : 0
                      return (
                        <tr key={m.month} className="border-b border-line last:border-b-0 hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-ink">{m.month}</td>
                          <td className="px-5 py-3.5 font-semibold text-slate-700">{m.requests}</td>
                          <td className="px-5 py-3.5 font-bold text-[#1f8a3d]">{m.fulfilled}</td>
                          <td className="px-5 py-3.5 font-bold text-slate-700">{rate}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  )
}
