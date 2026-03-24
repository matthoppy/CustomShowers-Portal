import { useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { LogOut, User } from 'lucide-react'

const pageTitles = {
  '/': 'Dashboard',
  '/contacts': 'Contacts',
  '/leads': 'Leads',
  '/customers': 'Customers',
  '/quotes': 'Quotes',
  '/quotes/new': 'New Quote',
  '/jobs': 'Jobs',
  '/invoices': 'Invoices',
  '/invoices/new': 'New Invoice',
}

function getTitle(pathname) {
  if (pageTitles[pathname]) return pageTitles[pathname]
  if (pathname.startsWith('/leads/')) return 'Lead Details'
  if (pathname.startsWith('/customers/')) return 'Customer Profile'
  if (pathname.startsWith('/quotes/') && pathname.endsWith('/edit')) return 'Edit Quote'
  if (pathname.startsWith('/quotes/')) return 'Quote Details'
  if (pathname.startsWith('/jobs/')) return 'Job Details'
  if (pathname.startsWith('/invoices/') && pathname.endsWith('/edit')) return 'Edit Invoice'
  if (pathname.startsWith('/invoices/')) return 'Invoice Details'
  return 'CRM'
}

export default function TopBar() {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-base font-semibold text-slate-800">{getTitle(pathname)}</h1>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt={user.user_metadata.full_name || user.email}
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
              <User className="w-4 h-4 text-indigo-600" />
            </div>
          )}
          <span className="hidden sm:block truncate max-w-[160px]">
            {user?.user_metadata?.full_name || user?.email}
          </span>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:block">Sign out</span>
        </button>
      </div>
    </header>
  )
}
