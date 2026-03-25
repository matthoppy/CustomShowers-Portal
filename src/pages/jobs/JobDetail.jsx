import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Edit2, Receipt, Plus, Trash2, CheckCircle2, Clock } from 'lucide-react'
import { useJob, useJobItems } from '../../hooks/useJobs'
import { useCustomers } from '../../hooks/useCustomers'
import { supabase } from '../../lib/supabase'
import Card, { CardHeader } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import FormInput, { FormSelect, FormTextarea } from '../../components/ui/FormInput'
import { formatDate, formatDatetime, formatCurrency } from '../../lib/utils'

const BATHROOM_LABELS = [
  'Bathroom',
  'Bathroom 1',
  'Bathroom 2',
  'Bathroom 3',
  'Downstairs Bathroom',
  'Downstairs Ensuite',
  'Ensuite',
  'Guest Ensuite',
  'Master Ensuite',
  'Upstairs Bathroom',
  'Upstairs Ensuite',
  'Custom…',
]

const SUPPLY_ONLY_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled']
const INSTALL_STATUSES = ['ordered', 'in_production', 'ready_to_install', 'in_progress', 'completed', 'cancelled']
const STATUS_LABELS = {
  ordered: 'Ordered',
  in_production: 'In Production',
  ready_to_install: 'Ready to Install',
  in_progress: 'In Progress',
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
}
const JOB_TYPES = [
  { value: 'supply_only', label: 'Supply Only' },
  { value: 'supply_and_install', label: 'Supply + London Installation' },
]

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { job, loading, error, update, setJob } = useJob(id)
  const { customers } = useCustomers()
  const { items: showers, add: addShower, update: updateShower, remove: removeShower } = useJobItems(id)

  const [editModal, setEditModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesVal, setNotesVal] = useState('')

  // Shower state
  const [showerModal, setShowerModal] = useState(false)
  const [showerForm, setShowerForm] = useState({ bathroom_label: 'Bathroom', custom_label: '', description: '', notes: '' })
  const [showerSaving, setShowerSaving] = useState(false)

  const setSF = (k) => (e) => setShowerForm((p) => ({ ...p, [k]: e.target.value }))

  const handleAddShower = async (e) => {
    e.preventDefault()
    setShowerSaving(true)
    const label = showerForm.bathroom_label === 'Custom…' ? showerForm.custom_label : showerForm.bathroom_label
    await addShower({ bathroom_label: label, description: showerForm.description, notes: showerForm.notes })
    setShowerSaving(false)
    setShowerModal(false)
    setShowerForm({ bathroom_label: 'Bathroom', custom_label: '', description: '', notes: '' })
  }

  const handleToggleShowerStatus = async (shower) => {
    const newStatus = shower.status === 'installed' ? 'pending' : 'installed'
    await updateShower(shower.id, { status: newStatus })
  }

  const openEdit = () => { setForm({ ...job }); setEditModal(true) }
  const openNotesEdit = () => { setNotesVal(job.notes || ''); setEditingNotes(true) }
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const handleEdit = async (e) => {
    e.preventDefault(); setSaving(true); setSaveError('')
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

  const handleSaveNotes = async () => {
    await update({ notes: notesVal })
    setJob((prev) => ({ ...prev, notes: notesVal }))
    setEditingNotes(false)
  }

  const handleCreateInvoice = async () => {
    const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true })
    const invoice_number = `INV-${String((count || 0) + 1).padStart(3, '0')}`
    const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 30)

    const isInstall = job.job_type === 'supply_and_install'
    const quoteTotal = Number(job.quotes?.total || 0)
    const finalTotal = isInstall ? Number((quoteTotal * 0.5).toFixed(2)) : 0
    const finalSubtotal = isInstall && job.quotes ? Number((Number(job.quotes.subtotal || quoteTotal / 1.2) * 0.5).toFixed(2)) : 0
    const finalVat = isInstall ? Number((finalTotal - finalSubtotal).toFixed(2)) : 0

    const { data } = await supabase.from('invoices').insert([{
      invoice_number,
      customer_id: job.customer_id,
      job_id: id,
      status: 'unpaid',
      invoice_type: isInstall ? 'final' : 'full',
      due_date: dueDate.toISOString().split('T')[0],
      subtotal: isInstall ? finalSubtotal : 0,
      vat_rate: job.quotes?.vat_rate || 20,
      vat_amount: isInstall ? finalVat : 0,
      total: isInstall ? finalTotal : 0,
      amount_paid: 0,
      notes: isInstall ? `Final 50% payment for job ${job.job_number}` : '',
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
          <Badge status={job.job_type} />
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
                <p className="text-slate-500 text-xs mb-1">Job Type</p>
                <Badge status={job.job_type || 'supply_only'} />
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Scheduled Date</p>
                <p className="text-slate-700">{formatDate(job.scheduled_date)}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Completion Date</p>
                <p className="text-slate-700">{formatDate(job.completion_date)}</p>
              </div>
              {job.quotes && (
                <div>
                  <p className="text-slate-500 text-xs mb-1">Linked Quote</p>
                  <Link to={`/quotes/${job.quote_id}`} className="text-indigo-600 hover:underline">{job.quotes.quote_number}</Link>
                </div>
              )}
            </div>
            {job.description && (
              <div className="mt-4 pt-4 border-t border-slate-100 text-sm">
                <p className="text-slate-500 text-xs mb-1">Description</p>
                <p className="text-slate-700 leading-relaxed">{job.description}</p>
              </div>
            )}
          </Card>

          {/* Showers */}
          <Card padding={false}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Showers</h3>
              <button
                onClick={() => setShowerModal(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Shower
              </button>
            </div>
            {showers.length === 0 ? (
              <div className="px-6 py-6 text-sm text-slate-400 italic">No showers added yet — click "Add Shower" to start.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {showers.map((shower) => (
                  <div key={shower.id} className="px-6 py-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => handleToggleShowerStatus(shower)}
                        className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          shower.status === 'installed'
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-300 hover:border-indigo-400'
                        }`}
                        title={shower.status === 'installed' ? 'Mark as pending' : 'Mark as installed'}
                      >
                        {shower.status === 'installed' && <CheckCircle2 className="w-3 h-3" />}
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-slate-800">{shower.bathroom_label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            shower.status === 'installed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {shower.status === 'installed' ? 'Installed' : 'Pending'}
                          </span>
                        </div>
                        {shower.description && <p className="text-xs text-slate-500 mt-0.5">{shower.description}</p>}
                        {shower.notes && <p className="text-xs text-slate-400 mt-0.5 italic">{shower.notes}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => removeShower(shower.id)}
                      className="shrink-0 p-1 text-slate-300 hover:text-red-500 transition-colors"
                      title="Remove shower"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Notes"
              action={!editingNotes && (
                <button onClick={openNotesEdit} className="text-xs text-indigo-600 hover:underline">
                  {job.notes ? 'Edit notes' : 'Add notes'}
                </button>
              )}
            />
            {editingNotes ? (
              <div className="space-y-3">
                <textarea
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                  rows={5} value={notesVal} onChange={(e) => setNotesVal(e.target.value)} autoFocus
                  placeholder="Installation notes, special requirements, access info, customer preferences..."
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" size="sm" onClick={() => setEditingNotes(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveNotes}>Save Notes</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap min-h-[3rem]">
                {job.notes || <span className="text-slate-400 italic">No notes yet — click "Add notes" to record job details, installation notes, or customer requirements.</span>}
              </p>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Update Status" />
            <div className="space-y-2">
              {(job.job_type === 'supply_and_install' ? INSTALL_STATUSES : SUPPLY_ONLY_STATUSES).map((s) => (
                <button key={s} onClick={() => handleStatusChange(s)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    job.status === s ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50 text-slate-600'
                  }`}>
                  <span>{STATUS_LABELS[s] || s}</span>
                  {job.status === s && <span className="text-xs text-indigo-500">Current</span>}
                </button>
              ))}
            </div>
          </Card>

          {job.status === 'completed' && (
            <Card>
              <CardHeader title="Invoice" />
              <Button icon={Receipt} variant="primary" className="w-full justify-center" onClick={handleCreateInvoice}>
                {job.job_type === 'supply_and_install' ? 'Create Final Invoice (50%)' : 'Create Invoice'}
              </Button>
            </Card>
          )}
        </div>
      </div>

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Job">
        <form onSubmit={handleEdit} className="space-y-4">
          {saveError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}
          <FormInput label="Job Title" required value={form.title || ''} onChange={set('title')} />
          <FormSelect label="Job Type" value={form.job_type || 'supply_only'} onChange={set('job_type')}>
            {JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </FormSelect>
          <FormSelect label="Customer" value={form.customer_id || ''} onChange={set('customer_id')}>
            <option value="">— No customer —</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
          </FormSelect>
          <FormSelect label="Status" value={form.status || 'scheduled'} onChange={set('status')}>
            {(form.job_type === 'supply_and_install' ? INSTALL_STATUSES : SUPPLY_ONLY_STATUSES).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
            ))}
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

      {/* Add Shower Modal */}
      <Modal open={showerModal} onClose={() => setShowerModal(false)} title="Add Shower">
        <form onSubmit={handleAddShower} className="space-y-4">
          <FormSelect label="Bathroom" required value={showerForm.bathroom_label} onChange={setSF('bathroom_label')}>
            {BATHROOM_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </FormSelect>
          {showerForm.bathroom_label === 'Custom…' && (
            <FormInput label="Custom Name" required value={showerForm.custom_label} onChange={setSF('custom_label')} placeholder="e.g. Pool House, Loft Conversion" />
          )}
          <FormInput label="Description" value={showerForm.description} onChange={setSF('description')} placeholder="e.g. Frameless walk-in, 1200mm, clear glass" />
          <FormTextarea label="Notes" value={showerForm.notes} onChange={setSF('notes')} placeholder="Access info, special requirements..." rows={2} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowerModal(false)}>Cancel</Button>
            <Button type="submit" disabled={showerSaving}>{showerSaving ? 'Adding...' : 'Add Shower'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
