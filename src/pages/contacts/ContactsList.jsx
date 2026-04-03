import { useState, useMemo } from 'react'
import { Plus, Search, Globe, PenLine, UserPlus, Trash2, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useContacts } from '../../hooks/useContacts'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import FormInput, { FormSelect, FormTextarea } from '../../components/ui/FormInput'

const SERVICE_TYPES = [
  'Frameless Shower Enclosure',
  'Semi-Frameless Shower',
  'Shower Screen',
  'Wet Room',
  'Bespoke Shower',
  'Supply Only',
  'Supply + Installation',
  'Other',
]

const JOB_TYPES = [
  { value: 'supply_only', label: 'Supply Only' },
  { value: 'supply_and_install', label: 'Supply + London Installation' },
]

const SOURCES = ['Website', 'Referral', 'Google', 'Social Media', 'Checkatrade', 'Other']

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  address: '',
  service_type: '',
  message: '',
}

function SourceBadge({ source }) {
  if (source === 'website') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        <Globe className="w-3 h-3" />
        Website
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
      <PenLine className="w-3 h-3" />
      Manual
    </span>
  )
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function ContactsList() {
  const { contacts, loading, create, remove } = useContacts()
  const navigate = useNavigate()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState('desc')

  // Convert to Lead state
  const [convertModal, setConvertModal] = useState(false)
  const [convertContact, setConvertContact] = useState(null)
  const [convertForm, setConvertForm] = useState({})
  const [convertSaving, setConvertSaving] = useState(false)
  const [convertError, setConvertError] = useState('')

  // Delete state
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteContact, setDeleteContact] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))
  const setC = (k) => (e) => setConvertForm((p) => ({ ...p, [k]: e.target.value }))

  const openConvert = (contact) => {
    setConvertContact(contact)
    setConvertForm({
      job_type: 'supply_only',
      source: 'Website',
      notes: contact.message || '',
    })
    setConvertError('')
    setConvertModal(true)
  }

  const openDelete = (contact) => {
    setDeleteContact(contact)
    setDeleteError('')
    setDeleteModal(true)
  }

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError('')
    const { error } = await remove(deleteContact.id)
    setDeleting(false)
    if (error) {
      setDeleteError(error.message)
    } else {
      setDeleteModal(false)
      setDeleteContact(null)
    }
  }

  const handleConvert = async (e) => {
    e.preventDefault()
    setConvertSaving(true)
    setConvertError('')

    // Check if customer already exists with this email
    let customerId = null
    if (convertContact.email) {
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('email', convertContact.email)
        .maybeSingle()
      customerId = existing?.id || null
    }

    // Create customer if none found
    if (!customerId) {
      const nameParts = (convertContact.name || '').trim().split(' ')
      const { data: newCustomer, error: custErr } = await supabase
        .from('customers')
        .insert([{
          first_name: nameParts[0] || convertContact.name,
          last_name: nameParts.slice(1).join(' ') || '',
          email: convertContact.email || '',
          phone: convertContact.phone || '',
          address_line1: convertContact.address || '',
        }])
        .select()
        .single()
      if (custErr) { setConvertError(custErr.message); setConvertSaving(false); return }
      customerId = newCustomer.id
    }

    // Create the lead
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .insert([{
        name: convertContact.name,
        email: convertContact.email || '',
        phone: convertContact.phone || '',
        source: convertForm.source,
        job_type: convertForm.job_type,
        notes: convertForm.notes || '',
        status: 'new',
        customer_id: customerId,
      }])
      .select()
      .single()

    setConvertSaving(false)
    if (leadErr) { setConvertError(leadErr.message); return }
    setConvertModal(false)
    navigate(`/leads/${lead.id}`)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { error } = await create(form)
    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      setModal(false)
      setForm(EMPTY_FORM)
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const rows = q
      ? contacts.filter(
          (c) =>
            c.name?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.phone?.toLowerCase().includes(q) ||
            c.service_type?.toLowerCase().includes(q)
        )
      : contacts
    return [...rows].sort((a, b) => {
      const diff = new Date(a.created_at) - new Date(b.created_at)
      return sortDir === 'desc' ? -diff : diff
    })
  }, [contacts, search, sortDir])

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Contacts</h2>
          <p className="text-sm text-slate-500">{contacts.length} total</p>
        </div>
        <Button icon={Plus} onClick={() => setModal(true)}>Add Contact</Button>
      </div>

      {/* Search + sort */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
          className="text-sm text-slate-500 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Date {sortDir === 'desc' ? '↓' : '↑'}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            {search ? 'No contacts match your search.' : 'No contacts yet. Add one or wait for website enquiries.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Phone</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Service</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Source</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(`/contacts/${contact.id}`)}>
                    <td className="px-4 py-3 font-medium text-slate-800">{contact.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} onClick={(e) => e.stopPropagation()} className="hover:text-blue-600 hover:underline">
                          {contact.email}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {contact.phone ? (
                        <a href={`tel:${contact.phone}`} onClick={(e) => e.stopPropagation()} className="hover:text-blue-600 hover:underline">
                          {contact.phone}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{contact.service_type || '—'}</td>
                    <td className="px-4 py-3"><SourceBadge source={contact.source} /></td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(contact.created_at)}</td>
                    <td className="px-4 py-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openConvert(contact)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                      >
                        <UserPlus className="w-3 h-3" />
                        Convert
                      </button>
                      <button
                        onClick={() => openDelete(contact)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                        title="Delete contact"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Convert to Lead Modal */}
      <Modal open={convertModal} onClose={() => setConvertModal(false)} title="Convert to Lead">
        {convertContact && (
          <form onSubmit={handleConvert} className="space-y-4">
            {convertError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{convertError}</p>}
            <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm">
              <p className="font-medium text-slate-800">{convertContact.name}</p>
              {convertContact.email && <p className="text-slate-500">{convertContact.email}</p>}
              {convertContact.phone && <p className="text-slate-500">{convertContact.phone}</p>}
            </div>
            <p className="text-xs text-slate-500">A customer record will be created automatically (or linked if this email already exists).</p>
            <FormSelect label="Job Type" required value={convertForm.job_type || 'supply_only'} onChange={setC('job_type')}>
              {JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </FormSelect>
            <FormSelect label="Lead Source" value={convertForm.source || 'Website'} onChange={setC('source')}>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </FormSelect>
            <FormTextarea label="Notes" value={convertForm.notes || ''} onChange={setC('notes')} placeholder="Requirements, project details..." rows={3} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setConvertModal(false)}>Cancel</Button>
              <Button type="submit" disabled={convertSaving}>{convertSaving ? 'Creating...' : 'Create Lead'}</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add Contact Modal */}
      <Modal open={modal} onClose={() => { setModal(false); setForm(EMPTY_FORM); setError('') }} title="Add New Contact">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <FormInput
            label="Full Name"
            required
            value={form.name}
            onChange={set('name')}
            placeholder="John Smith"
          />
          <FormInput
            label="Email"
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="john@example.com"
          />
          <FormInput
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={set('phone')}
            placeholder="07700 900000"
          />
          <FormInput
            label="Address"
            value={form.address}
            onChange={set('address')}
            placeholder="123 High Street, London"
          />
          <FormSelect
            label="Service Type"
            value={form.service_type}
            onChange={set('service_type')}
          >
            <option value="">— Select service —</option>
            {SERVICE_TYPES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </FormSelect>
          <FormTextarea
            label="Message / Notes"
            value={form.message}
            onChange={set('message')}
            placeholder="Project details, requirements..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => { setModal(false); setForm(EMPTY_FORM); setError('') }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Add Contact'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Contact">
        {deleteContact && (
          <div className="space-y-4">
            {deleteError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{deleteError}</p>}
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800 mb-1">Delete this contact?</p>
                <p className="text-sm text-slate-600">This will permanently delete <span className="font-medium">{deleteContact.name}</span> and cannot be undone.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDeleteModal(false)} type="button">Cancel</Button>
              <Button variant="danger" disabled={deleting} onClick={handleDelete}>
                {deleting ? 'Deleting...' : 'Delete Contact'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
