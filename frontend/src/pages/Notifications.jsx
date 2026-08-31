import { useEffect, useState } from 'react'
import { Bell, CheckCheck, Clock, Inbox } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout.jsx'
import LoadError from '../components/LoadError.jsx'
import { notificationsApi, describeError } from '../api/index.js'
import { timeAgo } from '../utils/dates.js'

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  async function refresh() {
    const data = await notificationsApi.list()
    setNotifications(data)
  }

  useEffect(() => {
    refresh()
      .catch((err) => setLoadError(describeError(err, 'Could not load your notifications.')))
      .finally(() => setLoading(false))
  }, [])

  async function handleMarkRead(id) {
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    await notificationsApi.markRead(id)
  }

  async function handleMarkAllRead() {
    setNotifications((list) => list.map((n) => ({ ...n, is_read: true })))
    await notificationsApi.markAllRead()
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <DashboardLayout active="Notifications">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
        <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight">Notifications</h1>
        {unreadCount > 0 && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-pink-dark text-xs font-bold hover:underline"
            onClick={handleMarkAllRead}
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>
      <p className="text-muted text-sm mb-6">
        {unreadCount > 0 ? `You have ${unreadCount} unread notification(s).` : "You're all caught up."}
      </p>

      <LoadError message={loadError} />

      {loading ? (
        <p className="text-muted py-8">Loading notifications…</p>
      ) : notifications.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-8 text-center text-muted text-sm shadow-xs">
          No notifications yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => !n.is_read && handleMarkRead(n.id)}
              className={`flex items-start gap-3.5 bg-white border rounded-2xl p-5 shadow-xs transition-all text-left w-full hover:border-pink/40 ${
                n.is_read ? 'border-line opacity-85' : 'border-pink/30 bg-pink-light/20'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-pink-light text-pink-dark flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.is_read ? 'font-semibold text-ink' : 'font-bold text-ink'}`}>{n.title}</p>
                <p className="text-muted text-xs mt-1 leading-relaxed">{n.message}</p>
                <p className="text-slate-400 text-[11px] mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{timeAgo(n.created_at)}</span>
                </p>
              </div>
              {!n.is_read && <span className="w-2.5 h-2.5 rounded-full bg-pink shrink-0 mt-2" />}
            </button>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
