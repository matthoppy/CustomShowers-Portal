import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useCustomers } from '../../hooks/useCustomers'
import { useInvoice } from '../../hooks/useInvoices'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import FormInput, { FormSelect, FormTextarea } from '../../components/ui/FormInput'
import { formatCurrency, calcTotals } from '../../lib/utils'

const emptyItem = () => ({ id: crypto.randomUUID(), description: '', quantity: 1, unit_price: '', total: 0 })

export default function InvoiceForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const { customers } = useCustomers()
  const { invoice, items: existingItems, loading: invoiceLoading } = useInvoice(id)

  const [form, setForm] = useState({
    customer_id: '',
    status: 'unpaid',
    due_date: '',
    notes: '',
    vat_rate: 20,
    amount_paid: 0,
  })
  const [items, setItems] = useState([emptyItem()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Set default due date (30 days from today)
  useEffect(() => {
    if (!isEdit) {
      const d = new Date()
      d.setDate(d.getDate() + 30)
      setForm((p) => ({ ...p, due_date: d.toISOString().split('T')[0] }))
    }
  }, [isEdit])

  useEffect(() => {
    if (isEdit && invoice) {
      setForm({
        customer_id: invoice.customer_id || '',
        status: invoice.status || 'unpaid',
        due_date: invoice.due_date || '',
        notes: invoice.notes || '',
        vat_rate: invoice.vat_rate ?? 20,
        amount_paid: invoice.amount_paid ?? 0,
      })
    }
  }, [invoice, isEdit])

  useEffect(() => {
    if (isEdit && existingItems.length > 0) {
      setItems(existingItems.map((i) => ({ ...i })))
    }
  }, [existingItems, isEdit])

  const setField = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const updateItem = (idx, key, val) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item
        const updated = { ...item, [key]: val }
        if (key === 'quantity' || key === 'unit_price') {
          updated.total = (Number(updated.quantity) || 0) * (Number(updated.unit_price) || 0)
        }
        return updated
      })
    )
  }

  const addItem = () => setItems((p) => [...p, emptyItem()])
  const removeItem = (idx) => setItems((p) => p.filter((_, i) => i !== idx))

  const { subtotal, vat_amount, total } = calcTotals(items, Number(form.vat_rate) || 20)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const totals = calcTotals(items, Number(form.vat_rate) || 20)

      if (isEdit) {
        const { error: iErr } = await supabase.from('invoices').update({
          ...form,
          ...totals,
          amount_paid: Number(form.amount_paid) || 0,
        }).eq('id', id)
        if (iErr) throw iErr
        await supabase.from('invoice_items').delete().eq('invoice_id', id)
        const itemRows = items.map(({ id: _id, ...item }) => ({
          invoice_id: id,
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          total: Number(item.total),
        }))
        const { error: iiErr } = await supabase.from('invoice_items').insert(itemRows)
        if (iiErr) throw iiErr
        navigate(`/invoices/${id}`)
      } else {
        const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true })
        const invoice_number = `INV-${String((count || 0) + 1).padStart(3, '0')}`

        const { data: newInv, error: invErr } = await supabase.from('invoices').insert([{
          ...form,
          ...totals,
          invoice_number,
          customer_id: form.customer_id || null,
          amount_paid: Number(form.amount_paid) || 0,
        }]).select().single()
        if (invErr) throw invErr

        const itemRows = items.map(({ id: _id, ...item }) => ({
          invoice_id: newInv.id,
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          total: Number(item.total),
        }))
        const { error: iiErr } = await supabase.from('invoice_items').insert(itemRows)
        if (iiErr) throw iiErr
        navigate(`/invoices/${newInv.id}`)
      }
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (isEdit && invoiceLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(isEdit ? `/invoices/${id}` : '/invoices')} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold text-slate-800">{isEdit ? `Edit ${invoice?.invoice_number}` : 'New Invoice'}</h2>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader title="Invoice Details" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="Customer" value={form.customer_id} onChange={setField('customer_id')}>
              <option value="">— No customer selected —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </FormSelect>
            <FormSelect label="Status" value={form.status} onChange={setField('status')}>
              {['unpaid', 'partial', 'paid'].map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </FormSelect>
            <FormInput label="Due Date" type="date" value={form.due_date} onChange={setField('due_date')} />
            <FormSelect label="VAT Rate" value={form.vat_rate} onChange={setField('vat_rate')}>
              <option value={0}>0% (Zero rated)</option>
              <option value={5}>5% (Reduced rate)</option>
              <option value={20}>20% (Standard rate)</option>
            </FormSelect>
            <FormInput
              label="Amount Already Paid (£)"
              type="number"
              min="0"
              step="0.01"
              value={form.amount_paid}
              onChange={setField('amount_paid')}
              placeholder="0.00"
            />
          </div>
          <FormTextarea label="Notes" className="mt-4" value={form.notes} onChange={setField('notes')} placeholder="Invoice notes..." />
        </Card>

        {/* Line Items */}
        <Card padding={false}>
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Line Items</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase w-24">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase w-32">Unit Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase w-32">Total</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        required
                        value={item.description}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                        placeholder="e.g. Shower installation labour"
                        className="w-full border-none outline-none text-sm text-slate-800 placeholder-slate-300 bg-transparent"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        className="w-full text-right border-none outline-none text-sm text-slate-800 bg-transparent"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={item.unit_price}
                        onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                        placeholder="0.00"
                        className="w-full text-right border-none outline-none text-sm text-slate-800 bg-transparent"
                      />
                    </td>
                    <td className="px-4 py-2 text-right text-slate-700 font-medium">
                      {formatCurrency(item.total)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100">
            <Button type="button" variant="ghost" size="sm" icon={Plus} onClick={addItem}>Add Line</Button>
          </div>
        </Card>

        {/* Totals */}
        <Card>
          <div className="ml-auto max-w-xs space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>VAT ({form.vat_rate}%)</span><span>{formatCurrency(vat_amount)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total</span><span>{formatCurrency(total)}</span>
            </div>
            {Number(form.amount_paid) > 0 && (
              <>
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Amount Paid</span><span>— {formatCurrency(form.amount_paid)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-red-600 pt-1 border-t border-slate-200">
                  <span>Balance Due</span><span>{formatCurrency(Math.max(0, total - Number(form.amount_paid)))}</span>
                </div>
              </>
            )}
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate(isEdit ? `/invoices/${id}` : '/invoices')}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </div>
  )
}
