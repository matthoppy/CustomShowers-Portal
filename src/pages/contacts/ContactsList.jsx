import { useState, useMemo } from 'react'
import { Plus, Search, Globe, PenLine } from 'lucide-react'
import { useContacts } from '../../hooks/useContacts'
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
  const { contacts, loading, create } = useContacts()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState('desc')

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{contact.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} className="hover:text-blue-600 hover:underline">
                          {contact.email}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {contact.phone ? (
                        <a href={`tel:${contact.phone}`} className="hover:text-blue-600 hover:underline">
                          {contact.phone}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{contact.service_type || '—'}</td>
                    <td className="px-4 py-3"><SourceBadge source={contact.source} /></td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(contact.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
    </div>
  )
}
