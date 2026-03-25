import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Edit2, CheckCircle, Briefcase, Wrench } from 'lucide-react'
import { useInvoice } from '../../hooks/useInvoices'
import { supabase } from '../../lib/supabase'
import Card, { CardHeader } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import FormInput from '../../components/ui/FormInput'
import { formatCurrency, formatDate, formatDatetime } from '../../lib/utils'

export default function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { invoice, items, loading, error, update } = useInvoice(id)
  const [payModal, setPayModal] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreateDeal = async () => {
    const { count } = await supabase.from('deals').select('*', { count: 'exact', head: true })
    const dealName = `Deal ${String((count || 0) + 1).padStart(3, '0')}`
    const { data } = await supabase.from('deals').insert([{
      deal_name: dealName,
      customer_id: invoice.customer_id,
      stage: 'ordered_from_supplier',
      amount: invoice.total,
    }]).select().single()
    if (data) navigate(`/deals/${data.id}`)
  }

  const handleCreateJob = async () => {
    const { count } = await supabase.from('jobs').select('*', { count: 'exact', head: true })
    const job_number = `JB-${String((count || 0) + 1).padStart(3, '0')}`
    const { data } = await supabase.from('jobs').insert([{
      job_number,
      customer_id: invoice.customer_id,
      job_type: 'supply_and_install',
      title: `Installation — ${invoice.invoice_number}`,
      status: 'ordered',
    }]).select().single()
    if (data) navigate(`/jobs/${data.id}`)
  }

  const handleMarkPaid = async () => {
    setSaving(true)
    await update({ status: 'paid', amount_paid: invoice.total, paid_date: new Date().toISOString().split('T')[0] })
    setSaving(false)
  }

  const handlePartialPay = async (e) => {
    e.preventDefault()
    setSaving(true)
    const newPaid = Number(payAmount)
    const status = newPaid >= Number(invoice.total) ? 'paid' : 'partial'
    await update({
      status,
      amount_paid: newPaid,
      paid_date: status === 'paid' ? new Date().toISOString().split('T')[0] : invoice.paid_date,
    })
    setSaving(false)
    setPayModal(false)
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
  if (error || !invoice) return <div className="text-red-600 py-10 text-center">{error || 'Invoice not found'}</div>

  const balanceDue = Math.max(0, Number(invoice.total || 0) - Number(invoice.amount_paid || 0))

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/invoices')} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-800">{invoice.invoice_number}</h2>
          <p className="text-sm text-slate-500">Created {formatDatetime(invoice.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge status={invoice.status} />
          <Link to={`/invoices/${id}/edit`}>
            <Button icon={Edit2} variant="secondary" size="sm">Edit</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader title="Invoice Information" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs mb-1">Customer</p>
                {invoice.customers ? (
                  <Link to={`/customers/${invoice.customer_id}`} className="text-indigo-600 hover:underline font-medium">
                    {invoice.customers.first_name} {invoice.customers.last_name}
                  </Link>
                ) : <span className="text-slate-400">—</span>}
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Linked Job</p>
                {invoice.jobs ? (
                  <Link to={`/jobs/${invoice.job_id}`} className="text-indigo-600 hover:underline">{invoice.jobs.job_number}</Link>
                ) : <span className="text-slate-400">—</span>}
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Due Date</p>
                <p className={`font-medium ${balanceDue > 0 && invoice.due_date && new Date(invoice.due_date) < new Date() ? 'text-red-600' : 'text-slate-700'}`}>
                  {formatDate(invoice.due_date)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Paid Date</p>
                <p className="text-slate-700">{formatDate(invoice.paid_date)}</p>
              </div>
            </div>
            {invoice.notes && (
              <div className="mt-4 pt-4 border-t border-slate-100 text-sm">
                <p className="text-slate-500 text-xs mb-1">Notes</p>
                <p className="text-slate-700 leading-relaxed">{invoice.notes}</p>
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
                <span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>VAT ({invoice.vat_rate}%)</span><span>{formatCurrency(invoice.vat_amount)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total</span><span>{formatCurrency(invoice.total)}</span>
              </div>
              {Number(invoice.amount_paid) > 0 && (
                <>
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Amount Paid</span><span>— {formatCurrency(invoice.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-red-600 pt-1 border-t border-slate-200">
                    <span>Balance Due</span><span>{formatCurrency(balanceDue)}</span>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Payment actions */}
        {invoice.status !== 'paid' && (
          <div className="space-y-4">
            <Card>
              <CardHeader title="Record Payment" />
              <div className="space-y-2">
                <Button
                  icon={CheckCircle}
                  variant="success"
                  className="w-full justify-center"
                  onClick={handleMarkPaid}
                  disabled={saving}
                >
                  Mark as Paid in Full
                </Button>
                <Button
                  variant="secondary"
                  className="w-full justify-center"
                  onClick={() => { setPayAmount(String(invoice.amount_paid || '')); setPayModal(true) }}
                >
                  Record Partial Payment
                </Button>
              </div>
            </Card>

            {/* Balance due card */}
            <Card>
              <p className="text-xs font-medium text-slate-500">Balance Due</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(balanceDue)}</p>
              <p className="text-xs text-slate-400 mt-1">Due {formatDate(invoice.due_date)}</p>
            </Card>
          </div>
        )}

        {invoice.status === 'paid' && (
          <>
            <Card>
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-emerald-700">Paid in Full</p>
                <p className="text-xs text-slate-400 mt-1">{formatDate(invoice.paid_date)}</p>
              </div>
            </Card>

            {invoice.invoice_type === 'full' && (
              <Card>
                <CardHeader title="Next Step" />
                <Button icon={Briefcase} variant="primary" className="w-full justify-center" onClick={handleCreateDeal}>
                  Create Deal
                </Button>
              </Card>
            )}

            {invoice.invoice_type === 'deposit' && (
              <Card>
                <CardHeader title="Next Step" />
                <Button icon={Wrench} variant="primary" className="w-full justify-center" onClick={handleCreateJob}>
                  Create Job
                </Button>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Partial payment modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Record Partial Payment" size="sm">
        <form onSubmit={handlePartialPay} className="space-y-4">
          <p className="text-sm text-slate-500">Total invoice: <strong>{formatCurrency(invoice.total)}</strong></p>
          <FormInput
            label="Amount Paid (£)"
            type="number"
            min="0"
            step="0.01"
            required
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            placeholder="0.00"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPayModal(false)} type="button">Cancel</Button>
            <Button type="submit" variant="success" disabled={saving}>{saving ? 'Saving...' : 'Save Payment'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
