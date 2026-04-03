import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, MapPin, Trash2, AlertCircle } from 'lucide-react'
import { useContact } from '../../hooks/useContacts'
import { useActivityLog } from '../../hooks/useActivityLog'
import { useTasks } from '../../hooks/useTasks'
import Card, { CardHeader } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import FormInput, { FormSelect, FormTextarea } from '../../components/ui/FormInput'
import ActivityTimeline from '../../components/ActivityTimeline'
import TaskList from '../../components/TaskList'
import GmailSync from '../../components/GmailSync'
import { formatDatetime } from '../../lib/utils'

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

function SourceBadge({ source }) {
  if (source === 'website') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        Website
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
      Manual
    </span>
  )
}

export default function ContactDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { contact, loading, error, update, remove } = useContact(id)
  const { activities, create: createActivity } = useActivityLog(id, null, null)
  const { tasks, create: createTask, update: updateTask, remove: removeTask } = useTasks(id, null, null)
  const [editModal, setEditModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [convertModal, setConvertModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const handleGmailSyncComplete = (newActivities) => {
    // Refresh activities when sync completes
    if (newActivities && newActivities.length > 0) {
      // You can trigger a refetch or update local state here
      console.log('Gmail sync completed:', newActivities)
    }
  }

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const openEdit = () => {
    setForm({ ...contact })
    setEditModal(true)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    const { error } = await update(form)
    setSaving(false)
    if (error) setSaveError(error.message)
    else setEditModal(false)
  }

  const handleDelete = async () => {
    setSaving(true)
    setSaveError('')
    const { error } = await remove()
    setSaving(false)
    if (error) {
      setSaveError(error.message)
    } else {
      navigate('/contacts')
    }
  }

  const handleCreateTask = async (taskData) => {
    try {
      await createTask(taskData)
    } catch (err) {
      console.error('Error creating task:', err)
    }
  }

  const handleCompleteTask = async (taskId, newStatus) => {
    try {
      await updateTask(taskId, { status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null })
    } catch (err) {
      console.error('Error updating task:', err)
    }
  }

  const handleDeleteTask = async (taskId) => {
    try {
      await removeTask(taskId)
    } catch (err) {
      console.error('Error deleting task:', err)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
  if (error || !contact) return <div className="text-red-600 py-10 text-center">{error || 'Contact not found'}</div>

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/contacts')} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-800">{contact.name}</h2>
          <p className="text-sm text-slate-500">Contact · Received {formatDatetime(contact.created_at)}</p>
        </div>
        <SourceBadge source={contact.source} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="Contact Details"
            action={<Button size="sm" variant="secondary" onClick={openEdit}>Edit</Button>}
          />
          <div className="space-y-3">
            {contact.email && (
              <div className="flex items-center gap-2.5 text-sm">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <a href={`mailto:${contact.email}`} className="text-indigo-600 hover:underline">{contact.email}</a>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2.5 text-sm">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <a href={`tel:${contact.phone}`} className="text-slate-700">{contact.phone}</a>
              </div>
            )}
            {contact.address && (
              <div className="flex items-start gap-2.5 text-sm">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="text-slate-700">{contact.address}</span>
              </div>
            )}
            {contact.service_type && (
              <div className="text-sm">
                <span className="text-slate-500">Service Type: </span>
                <span className="text-slate-700">{contact.service_type}</span>
              </div>
            )}
            {contact.message && (
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-1">Message</p>
                <p className="text-sm text-slate-600 leading-relaxed">{contact.message}</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Actions" />
          <div className="space-y-2">
            <button
              onClick={() => setConvertModal(true)}
              className="w-full px-4 py-2.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors"
            >
              Convert to Lead
            </button>
            <button
              onClick={() => setDeleteModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Contact
            </button>
          </div>
        </Card>
      </div>

      {/* Tasks */}
      <Card>
        <CardHeader title="Tasks & Follow-ups" />
        <TaskList
          tasks={tasks}
          onCreateTask={handleCreateTask}
          onCompleteTask={handleCompleteTask}
          onDeleteTask={handleDeleteTask}
        />
      </Card>

      {/* Gmail Sync */}
      {contact.email && (
        <Card>
          <CardHeader title="Email Sync" />
          <GmailSync
            contactId={id}
            contactEmail={contact.email}
            onSyncComplete={handleGmailSyncComplete}
          />
        </Card>
      )}

      {/* Activity Timeline */}
      <Card>
        <CardHeader title="Activity & Emails" />
        <ActivityTimeline activities={activities} />
      </Card>

      {/* Edit Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Contact">
        <form onSubmit={handleEdit} className="space-y-4">
          {saveError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}
          <FormInput label="Full Name" required value={form.name || ''} onChange={set('name')} />
          <FormInput label="Email" type="email" value={form.email || ''} onChange={set('email')} />
          <FormInput label="Phone" value={form.phone || ''} onChange={set('phone')} />
          <FormInput label="Address" value={form.address || ''} onChange={set('address')} />
          <FormSelect label="Service Type" value={form.service_type || ''} onChange={set('service_type')}>
            <option value="">— Select service —</option>
            {SERVICE_TYPES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </FormSelect>
          <FormTextarea label="Message / Notes" value={form.message || ''} onChange={set('message')} placeholder="Project details, requirements..." rows={3} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditModal(false)} type="button">Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>

      {/* Convert to Lead Modal */}
      <Modal open={convertModal} onClose={() => setConvertModal(false)} title="Convert to Lead">
        <p className="text-sm text-slate-600 mb-4">This will create a new lead and customer record from this contact information.</p>
        <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm mb-4">
          <p className="font-medium text-slate-800">{contact.name}</p>
          {contact.email && <p className="text-slate-500">{contact.email}</p>}
          {contact.phone && <p className="text-slate-500">{contact.phone}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConvertModal(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setConvertModal(false)
              navigate('/contacts')
            }}
          >
            Proceed to Convert
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Contact">
        <div className="space-y-4">
          {saveError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800 mb-1">Delete this contact?</p>
              <p className="text-sm text-slate-600">This will permanently delete <span className="font-medium">{contact.name}</span> and cannot be undone.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setDeleteModal(false)} type="button">Cancel</Button>
            <Button variant="danger" disabled={saving} onClick={handleDelete}>
              {saving ? 'Deleting...' : 'Delete Contact'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
