import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useInvoices } from '../../hooks/useInvoices'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import { formatCurrency, formatDate, formatDatetime } from '../../lib/utils'

const STATUSES = ['unpaid', 'partial', 'paid']

export default function InvoicesList() {
  const { invoices, loading } = useInvoices()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? invoices : invoices.filter((i) => i.status === filter)

  const outstanding = invoices
    .filter((i) => i.status !== 'paid')
    .reduce((s, i) => s + (Number(i.total || 0) - Number(i.amount_paid || 0)), 0)

  const totalRevenue = invoices
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + Number(i.total || 0), 0)

  const statusCounts = invoices.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1
    return acc
  }, {})

  const columns = [
    { key: 'invoice_number', label: 'Invoice #' },
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
      key: 'amount_paid',
      label: 'Paid',
      accessor: (r) => formatCurrency(r.amount_paid),
    },
    {
      key: 'due_date',
      label: 'Due Date',
      accessor: (r) => formatDate(r.due_date),
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
          <h2 className="text-lg font-semibold text-slate-800">Invoices</h2>
          <p className="text-sm text-slate-500">{invoices.length} total</p>
        </div>
        <Link to="/invoices/new"><Button icon={Plus}>New Invoice</Button></Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <p className="text-xs font-medium text-slate-500">Outstanding</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(outstanding)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-slate-500">Total Collected</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(totalRevenue)}</p>
        </Card>
      </div>

      {/* Status filters */}
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
        onRowClick={(r) => navigate(`/invoices/${r.id}`)}
        searchPlaceholder="Search invoices..."
        emptyMessage={loading ? 'Loading...' : 'No invoices found'}
      />
    </div>
  )
}
