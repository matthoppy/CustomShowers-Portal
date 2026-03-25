import { Link } from 'react-router-dom'
import { Phone, PhoneIncoming, PhoneMissed, PhoneOff } from 'lucide-react'
import { useCalls } from '../../hooks/useCalls'
import DataTable from '../../components/ui/DataTable'
import { formatDatetime } from '../../lib/utils'
import { useState } from 'react'

const STATUS_CONFIG = {
  completed:   { label: 'Answered',  className: 'bg-green-100 text-green-700',  Icon: PhoneIncoming },
  'in-progress':{ label: 'Active',   className: 'bg-blue-100 text-blue-700',    Icon: Phone },
  'no-answer': { label: 'Missed',    className: 'bg-amber-100 text-amber-700',  Icon: PhoneMissed },
  busy:        { label: 'Busy',      className: 'bg-orange-100 text-orange-700',Icon: PhoneOff },
  failed:      { label: 'Failed',    className: 'bg-red-100 text-red-700',      Icon: PhoneOff },
  initiated:   { label: 'Initiated', className: 'bg-slate-100 text-slate-600',  Icon: Phone },
  ringing:     { label: 'Ringing',   className: 'bg-slate-100 text-slate-600',  Icon: Phone },
}

function CallStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, className: 'bg-slate-100 text-slate-600', Icon: Phone }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      <cfg.Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

function formatDuration(seconds) {
  if (!seconds || seconds === 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatNumber(num) {
  if (!num) return '—'
  return num.replace(/(\+44)(\d{4})(\d{6})/, '$1 $2 $3') || num
}

export default function CallsList() {
  const { calls, loading } = useCalls()
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = calls.filter((c) => {
    if (statusFilter === 'answered') return c.status === 'completed'
    if (statusFilter === 'missed') return ['no-answer', 'busy', 'failed'].includes(c.status)
    return true
  })

  const answered = calls.filter((c) => c.status === 'completed').length
  const missed = calls.filter((c) => ['no-answer', 'busy'].includes(c.status)).length

  const columns = [
    {
      key: 'started_at',
      label: 'Date & Time',
      accessor: (r) => formatDatetime(r.started_at || r.created_at),
    },
    {
      key: 'caller_number',
      label: 'Caller',
      render: (val, row) => {
        const name = row.contacts?.name || row.leads?.name
        return (
          <div>
            {name && <p className="text-sm font-medium text-slate-800">{name}</p>}
            <p className={`text-sm ${name ? 'text-slate-500' : 'text-slate-800'}`}>{formatNumber(val)}</p>
          </div>
        )
      },
    },
    {
      key: 'contact',
      label: 'Linked To',
      accessor: (r) => r.contacts?.name || r.leads?.name || '—',
      render: (val, row) => {
        if (row.contacts) return <Link to={`/contacts`} className="text-indigo-600 hover:underline text-sm">{row.contacts.name}</Link>
        if (row.leads) return <Link to={`/leads/${row.lead_id}`} className="text-indigo-600 hover:underline text-sm">{row.leads.name}</Link>
        return <span className="text-sm text-slate-400">Unknown</span>
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <CallStatusBadge status={val} />,
    },
    {
      key: 'duration',
      label: 'Duration',
      accessor: (r) => formatDuration(r.duration),
    },
  ]

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Calls</h2>
          <p className="text-sm text-slate-500">
            {answered} answered · {missed} missed · {calls.length} total
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[['all', 'All Calls'], ['answered', 'Answered'], ['missed', 'Missed']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setStatusFilter(val)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === val
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        searchPlaceholder="Search calls..."
        emptyMessage={loading ? 'Loading...' : 'No calls logged yet'}
      />
    </div>
  )
}
