import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Edit2, Receipt } from 'lucide-react'
import { useJob } from '../../hooks/useJobs'
import { useCustomers } from '../../hooks/useCustomers'
import { supabase } from '../../lib/supabase'
import Card, { CardHeader } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import FormInput, { FormSelect, FormTextarea } from '../../components/ui/FormInput'
import { formatDate, formatDatetime } from '../../lib/utils'

const STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled']

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { job, loading, error, update, setJob } = useJob(id)
  const { customers } = useCustomers()
  const [editModal, setEditModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const openEdit = () => {
    setForm({ ...job })
    setEditModal(true)
  }

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const handleEdit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    const { error } = await update(form)
    setSaving(false)
    if (error) setSaveError(error.message)
    else setEditModal(false)
  }

  const handleStatusChange = async (status) => {
    const extra = status === 'completed' ? { completion_date: new Date().toISOString().split('T')[0] } : {}
    const { data } = await update({ status, ...extra })
    if (data) setJob((prev) => ({ ...prev, status, ...extra }))
  }

  const handleCreateInvoice = async () => {
    const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true })
    const invoice_number = `INV-${String((count || 0) + 1).padStart(3, '0')}`
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)
    const { data } = await supabase.from('invoices').insert([{
      invoice_number,
      customer_id: job.customer_id,
      job_id: id,
      status: 'unpaid',
      due_date: dueDate.toISOString().split('T')[0],
      subtotal: 0,
      vat_rate: 20,
      vat_amount: 0,
      total: 0,
      amount_paid: 0,
    }]).select().single()
    if (data) navigate(`/invoices/${data.id}/edit`)
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
  if (error || !job) return <div className="text-red-600 py-10 text-center">{error || 'Job not found'}</div>

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/jobs')} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-800">{job.title}</h2>
          <p className="text-sm text-slate-500">{job.job_number} · Created {formatDatetime(job.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge status={job.status} />
          <Button icon={Edit2} variant="secondary" size="sm" onClick={openEdit}>Edit</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader title="Job Details" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs mb-1">Customer</p>
                {job.customers ? (
                  <Link to={`/customers/${job.customer_id}`} className="text-indigo-600 hover:underline font-medium">
                    {job.customers.first_name} {job.customers.last_name}
                  </Link>
                ) : <span className="text-slate-400">—</span>}
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Linked Quote</p>
                {job.quotes ? (
                  <Link to={`/quotes/${job.quote_id}`} className="text-indigo-600 hover:underline">{job.quotes.quote_number}</Link>
                ) : <span className="text-slate-400">—</span>}
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Scheduled Date</p>
                <p className="text-slate-700">{formatDate(job.scheduled_date)}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Completion Date</p>
                <p className="text-slate-700">{formatDate(job.completion_date)}</p>
              </div>
            </div>
            {job.description && (
              <div className="mt-4 pt-4 border-t border-slate-100 text-sm">
                <p className="text-slate-500 text-xs mb-1">Description</p>
                <p className="text-slate-700 leading-relaxed">{job.description}</p>
              </div>
            )}
            {job.notes && (
              <div className="mt-4 pt-4 border-t border-slate-100 text-sm">
                <p className="text-slate-500 text-xs mb-1">Notes</p>
                <p className="text-slate-700 leading-relaxed">{job.notes}</p>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Update Status" />
            <div className="space-y-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    job.status === s
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span>{s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}</span>
                  {job.status === s && <span className="text-xs text-indigo-500">Current</span>}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Invoice" />
            <Button icon={Receipt} variant="primary" className="w-full justify-center" onClick={handleCreateInvoice}>
              Create Invoice
            </Button>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Job">
        <form onSubmit={handleEdit} className="space-y-4">
          {saveError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}
          <FormInput label="Job Title" required value={form.title || ''} onChange={set('title')} />
          <FormSelect label="Customer" value={form.customer_id || ''} onChange={set('customer_id')}>
            <option value="">— No customer —</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
          </FormSelect>
          <FormSelect label="Status" value={form.status || 'scheduled'} onChange={set('status')}>
            {STATUSES.map((s) => <option key={s} value={s}>{s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </FormSelect>
          <FormInput label="Scheduled Date" type="date" value={form.scheduled_date || ''} onChange={set('scheduled_date')} />
          <FormInput label="Completion Date" type="date" value={form.completion_date || ''} onChange={set('completion_date')} />
          <FormTextarea label="Description" value={form.description || ''} onChange={set('description')} />
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
