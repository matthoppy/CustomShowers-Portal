import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Edit2, Phone, Mail, MapPin, FileText, Wrench, Receipt } from 'lucide-react'
import { useCustomer } from '../../hooks/useCustomers'
import { supabase } from '../../lib/supabase'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import FormInput, { FormTextarea } from '../../components/ui/FormInput'
import { formatCurrency, formatDatetime } from '../../lib/utils'

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { customer, loading, error, update } = useCustomer(id)
  const [tab, setTab] = useState('quotes')
  const [related, setRelated] = useState({ quotes: [], jobs: [], invoices: [] })
  const [editModal, setEditModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('quotes').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
      supabase.from('jobs').select('*').eq('customer_id', id).order('scheduled_date', { ascending: false }),
      supabase.from('invoices').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
    ]).then(([{ data: quotes }, { data: jobs }, { data: invoices }]) => {
      setRelated({ quotes: quotes || [], jobs: jobs || [], invoices: invoices || [] })
    })
  }, [id])

  useEffect(() => {
    if (customer) setForm(customer)
  }, [customer])

  const handleEdit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await update(form)
    setSaving(false)
    setEditModal(false)
  }

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
  if (error || !customer) return <div className="text-red-600 py-10 text-center">{error || 'Customer not found'}</div>

  const fullName = `${customer.first_name} ${customer.last_name}`

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/customers')} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-800">{fullName}</h2>
          <p className="text-sm text-slate-500">Added {formatDatetime(customer.created_at)}</p>
        </div>
        <Button icon={Edit2} variant="secondary" size="sm" onClick={() => setEditModal(true)}>Edit</Button>
      </div>

      {/* Profile cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Contact Information" />
          <div className="space-y-3">
            {customer.email && (
              <div className="flex items-center gap-2.5 text-sm">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <a href={`mailto:${customer.email}`} className="text-indigo-600 hover:underline">{customer.email}</a>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2.5 text-sm">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <a href={`tel:${customer.phone}`} className="text-slate-700">{customer.phone}</a>
              </div>
            )}
            {(customer.address_line1 || customer.city) && (
              <div className="flex items-start gap-2.5 text-sm">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <address className="not-italic text-slate-700 leading-relaxed">
                  {[customer.address_line1, customer.address_line2, customer.city, customer.postcode]
                    .filter(Boolean).join(', ')}
                </address>
              </div>
            )}
            {!customer.email && !customer.phone && !customer.address_line1 && (
              <p className="text-sm text-slate-400">No contact info added</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Shower Preferences" />
          <p className="text-sm text-slate-600 leading-relaxed">{customer.shower_preferences || 'No preferences recorded'}</p>
          {customer.notes && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
              <p className="text-sm text-slate-600 leading-relaxed">{customer.notes}</p>
            </div>
          )}
        </Card>
      </div>

      {/* Related records tabs */}
      <Card padding={false}>
        <div className="flex border-b border-slate-200">
          {[
            { key: 'quotes', label: 'Quotes', count: related.quotes.length, icon: FileText },
            { key: 'jobs', label: 'Jobs', count: related.jobs.length, icon: Wrench },
            { key: 'invoices', label: 'Invoices', count: related.invoices.length, icon: Receipt },
          ].map(({ key, label, count, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              <span className="bg-slate-100 text-slate-600 text-xs px-1.5 py-0.5 rounded-full">{count}</span>
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === 'quotes' && (
            related.quotes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400 mb-3">No quotes yet</p>
                <Link to={`/quotes/new?customer=${id}`}>
                  <Button size="sm">Create Quote</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {related.quotes.map((q) => (
                  <Link key={q.id} to={`/quotes/${q.id}`} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{q.quote_number}</p>
                      <p className="text-xs text-slate-400">{formatDatetime(q.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-700">{formatCurrency(q.total)}</span>
                      <Badge status={q.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}

          {tab === 'jobs' && (
            related.jobs.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No jobs yet</p>
            ) : (
              <div className="space-y-2">
                {related.jobs.map((j) => (
                  <Link key={j.id} to={`/jobs/${j.id}`} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{j.title}</p>
                      <p className="text-xs text-slate-400">{j.job_number}</p>
                    </div>
                    <Badge status={j.status} />
                  </Link>
                ))}
              </div>
            )
          )}

          {tab === 'invoices' && (
            related.invoices.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No invoices yet</p>
            ) : (
              <div className="space-y-2">
                {related.invoices.map((inv) => (
                  <Link key={inv.id} to={`/invoices/${inv.id}`} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{inv.invoice_number}</p>
                      <p className="text-xs text-slate-400">{formatDatetime(inv.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-700">{formatCurrency(inv.total)}</span>
                      <Badge status={inv.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}
        </div>
      </Card>

      {/* Edit Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Customer" size="lg">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="First Name" required value={form.first_name || ''} onChange={set('first_name')} />
            <FormInput label="Last Name" required value={form.last_name || ''} onChange={set('last_name')} />
          </div>
          <FormInput label="Email" type="email" value={form.email || ''} onChange={set('email')} />
          <FormInput label="Phone" value={form.phone || ''} onChange={set('phone')} />
          <FormInput label="Address Line 1" value={form.address_line1 || ''} onChange={set('address_line1')} />
          <FormInput label="Address Line 2" value={form.address_line2 || ''} onChange={set('address_line2')} />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="City" value={form.city || ''} onChange={set('city')} />
            <FormInput label="Postcode" value={form.postcode || ''} onChange={set('postcode')} />
          </div>
          <FormTextarea label="Shower Preferences" value={form.shower_preferences || ''} onChange={set('shower_preferences')} />
          <FormTextarea label="Notes" value={form.notes || ''} onChange={set('notes')} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditModal(false)} type="button">Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
