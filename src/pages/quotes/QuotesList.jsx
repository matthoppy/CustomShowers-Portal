import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useQuotes } from '../../hooks/useQuotes'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { formatCurrency, formatDatetime } from '../../lib/utils'

const STATUSES = ['draft', 'sent', 'accepted', 'rejected']

export default function QuotesList() {
  const { quotes, loading } = useQuotes()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? quotes : quotes.filter((q) => q.status === filter)

  const statusCounts = quotes.reduce((acc, q) => {
    acc[q.status] = (acc[q.status] || 0) + 1
    return acc
  }, {})

  const columns = [
    { key: 'quote_number', label: 'Quote #' },
    {
      key: 'customer',
      label: 'Customer',
      accessor: (r) => r.customers ? `${r.customers.first_name} ${r.customers.last_name}` : '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <Badge status={val} />,
    },
    {
      key: 'total',
      label: 'Total',
      accessor: (r) => formatCurrency(r.total),
    },
    {
      key: 'valid_until',
      label: 'Valid Until',
      accessor: (r) => formatDatetime(r.valid_until),
    },
    {
      key: 'created_at',
      label: 'Created',
      accessor: (r) => formatDatetime(r.created_at),
    },
  ]

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Quotes</h2>
          <p className="text-sm text-slate-500">{quotes.length} total</p>
        </div>
        <Link to="/quotes/new"><Button icon={Plus}>New Quote</Button></Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[['all', 'All'], ...STATUSES.map((s) => [s, s.charAt(0).toUpperCase() + s.slice(1)])].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === val
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {label}
            {val !== 'all' && (
              <span className={`ml-1.5 ${filter === val ? 'opacity-75' : 'text-slate-400'}`}>
                {statusCounts[val] || 0}
              </span>
            )}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={(r) => navigate(`/quotes/${r.id}`)}
        searchPlaceholder="Search quotes..."
        emptyMessage={loading ? 'Loading...' : 'No quotes found'}
      />
    </div>
  )
}
