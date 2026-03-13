import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Edit2, Wrench } from 'lucide-react'
import { useQuote } from '../../hooks/useQuotes'
import { supabase } from '../../lib/supabase'
import Card, { CardHeader } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { formatCurrency, formatDate, formatDatetime } from '../../lib/utils'

const STATUS_ACTIONS = {
  draft: [{ label: 'Mark as Sent', status: 'sent', variant: 'primary' }],
  sent: [
    { label: 'Mark Accepted', status: 'accepted', variant: 'success' },
    { label: 'Mark Rejected', status: 'rejected', variant: 'danger' },
  ],
  accepted: [],
  rejected: [],
}

export default function QuoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { quote, items, loading, error, update } = useQuote(id)

  const handleStatus = async (status) => {
    await update({ status })
  }

  const handleCreateJob = async () => {
    const { count } = await supabase.from('jobs').select('*', { count: 'exact', head: true })
    const job_number = `JB-${String((count || 0) + 1).padStart(3, '0')}`
    const { data } = await supabase.from('jobs').insert([{
      job_number,
      customer_id: quote.customer_id,
      quote_id: id,
      title: `Installation — ${quote.quote_number}`,
      status: 'scheduled',
    }]).select().single()
    if (data) navigate(`/jobs/${data.id}`)
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
  if (error || !quote) return <div className="text-red-600 py-10 text-center">{error || 'Quote not found'}</div>

  const actions = STATUS_ACTIONS[quote.status] || []

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/quotes')} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-800">{quote.quote_number}</h2>
          <p className="text-sm text-slate-500">Created {formatDatetime(quote.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge status={quote.status} />
          <Link to={`/quotes/${id}/edit`}>
            <Button icon={Edit2} variant="secondary" size="sm">Edit</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main info */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader title="Quote Information" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs mb-1">Customer</p>
                {quote.customers ? (
                  <Link to={`/customers/${quote.customer_id}`} className="text-indigo-600 hover:underline font-medium">
                    {quote.customers.first_name} {quote.customers.last_name}
                  </Link>
                ) : <span className="text-slate-400">—</span>}
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Valid Until</p>
                <p className="text-slate-700">{formatDate(quote.valid_until)}</p>
              </div>
            </div>
            {quote.notes && (
              <div className="mt-4 pt-4 border-t border-slate-100 text-sm">
                <p className="text-slate-500 text-xs mb-1">Notes</p>
                <p className="text-slate-700 leading-relaxed">{quote.notes}</p>
              </div>
            )}
          </Card>

          {/* Line items */}
          <Card padding={false}>
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Line Items</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Unit Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No line items</td></tr>
                ) : items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-slate-700">{item.description}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(item.unit_price)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 border-t border-slate-100 space-y-1.5">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span><span>{formatCurrency(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>VAT ({quote.vat_rate}%)</span><span>{formatCurrency(quote.vat_amount)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total</span><span>{formatCurrency(quote.total)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Actions sidebar */}
        <div className="space-y-4">
          {actions.length > 0 && (
            <Card>
              <CardHeader title="Actions" />
              <div className="space-y-2">
                {actions.map(({ label, status, variant }) => (
                  <Button key={status} variant={variant} className="w-full justify-center" onClick={() => handleStatus(status)}>
                    {label}
                  </Button>
                ))}
              </div>
            </Card>
          )}

          {quote.status === 'accepted' && (
            <Card>
              <CardHeader title="Next Steps" />
              <Button icon={Wrench} variant="primary" className="w-full justify-center" onClick={handleCreateJob}>
                Create Job
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
