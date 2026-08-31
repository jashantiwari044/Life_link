import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Heart,
  Clock,
  Droplet,
  CheckCircle2,
  Building2,
  MapPin,
  ArrowRight,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout.jsx'
import LoadError from '../components/LoadError.jsx'
import DonationNextSteps from '../components/DonationNextSteps.jsx'
import { usersApi, describeError } from '../api/index.js'
import { formatDate } from '../utils/dates.js'
import { collectionCentre, donationStatus } from '../constants/donationStatus.js'

export default function DonationHistory() {
  const [bloodGroup, setBloodGroup] = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [nextSteps, setNextSteps] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([usersApi.getMe(), usersApi.getDonationHistory()])
      .then(([profile, entries]) => {
        if (cancelled) return
        setBloodGroup(profile.blood_group)
        setHistory(entries)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(describeError(err, 'Could not load your donation history.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const completed = history.filter((d) => d.status === 'BLOOD_COLLECTED')
  const pending = history.filter((d) => d.status === 'ACCEPTED')

  return (
    <DashboardLayout active="Donation Hist.">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">Donation History</h1>
        <p className="text-muted text-sm">Every time you've responded and saved lives as a {bloodGroup || '—'} donor.</p>
      </div>

      <LoadError message={loadError} />

      {completed.length > 0 && (
        <div className="rounded-2xl bg-[#e3f5e8] border border-[#86efac]/70 p-4 sm:p-5 mb-6 shadow-xs flex items-center gap-3.5">
          <CheckCircle2 className="w-5 h-5 text-[#1f8a3d] shrink-0" />
          <div>
            <p className="text-sm font-bold text-[#1f8a3d]">
              Thank you — you've completed {completed.length} donation{completed.length > 1 ? 's' : ''}
            </p>
            <p className="text-[#1f8a3d] text-xs mt-0.5">
              That's up to {completed.length * 3} lives you may have helped save.
            </p>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div className="rounded-2xl border border-pink/30 bg-pink-light/70 p-4 sm:p-5 mb-6 shadow-xs flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-[240px] flex-1">
            <Clock className="w-5 h-5 text-pink-dark shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-ink">
                {pending.length} donation{pending.length > 1 ? 's' : ''} still to give
              </p>
              <p className="text-muted text-xs mt-1">
                You committed to donate blood. Please visit the assigned blood bank so they can verify your collection.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNextSteps(pending[0].request)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-pink text-white shadow-xs hover:bg-pink-dark transition-all"
          >
            <span>See where to go</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="flex gap-4 flex-wrap mb-10">
        <div className="bg-white border border-line rounded-2xl p-5 w-[200px] shadow-xs">
          <p className="text-muted text-xs mb-1 font-semibold">Completed Donations</p>
          <p className="text-2xl font-extrabold text-[#1f8a3d]">{completed.length}</p>
        </div>
        <div className="bg-white border border-line rounded-2xl p-5 w-[200px] shadow-xs">
          <p className="text-muted text-xs mb-1 font-semibold">Awaiting Donation</p>
          <p className="text-2xl font-extrabold text-[#b9770e]">{pending.length}</p>
        </div>
        <div className="bg-white border border-line rounded-2xl p-5 w-[200px] shadow-xs">
          <p className="text-muted text-xs mb-1 font-semibold">Blood Group</p>
          <p className="text-2xl font-extrabold text-pink-dark">{bloodGroup || '—'}</p>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="text-lg sm:text-xl font-bold mb-4 text-ink">Your Donations</h2>
        {loading ? (
          <p className="text-muted py-8">Loading donation history…</p>
        ) : history.length === 0 ? (
          <div className="bg-white border border-line rounded-2xl p-8 text-center text-muted text-sm shadow-xs">
            You haven't responded to any requests yet.{' '}
            <Link to="/published-requests" className="text-pink-dark font-semibold hover:underline">
              Browse Published Requests →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {history.map((entry) => {
              const state = donationStatus(entry.status)
              const centre = collectionCentre(entry.request)
              return (
                <div key={entry.id} className="bg-white border border-line rounded-2xl p-5 shadow-xs transition-all duration-150 hover:border-slate-300">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-[220px]">
                      <p className="text-sm font-bold text-ink">
                        {entry.request?.blood_group_required ?? bloodGroup} for{' '}
                        {entry.request?.patient_name ?? `Request #${entry.request_id}`}
                      </p>
                      <p className="text-muted text-xs mt-1">
                        {entry.request?.hospital?.org_name
                          ? `${entry.request.hospital.org_name} · `
                          : ''}
                        Responded on {formatDate(entry.timestamp)}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${state.badge}`}>
                      {state.label}
                    </span>
                    {!state.done && (
                      <button
                        type="button"
                        onClick={() => setNextSteps(entry.request)}
                        className="inline-flex items-center justify-center rounded-full px-5 py-2 text-xs font-bold bg-white text-ink border border-line transition-all duration-150 hover:-translate-y-px hover:border-pink hover:text-pink-dark"
                      >
                        Where to go →
                      </button>
                    )}
                  </div>

                  <p
                    className={`text-xs font-semibold mt-3 pt-3 border-t border-line flex items-center gap-1.5 ${
                      state.done ? 'text-[#1f8a3d]' : 'text-[#b9770e]'
                    }`}
                  >
                    {state.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    <span>
                      {state.summary}
                      {!state.done && centre && ` Visit ${centre.org_name}, ${centre.address}.`}
                      {state.done && entry.request?.status === 'BLOOD_RECEIVED' &&
                        ' The hospital has confirmed it reached the patient.'}
                    </span>
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <DonationNextSteps
        request={nextSteps}
        open={nextSteps !== null}
        onClose={() => setNextSteps(null)}
      />
    </DashboardLayout>
  )
}
