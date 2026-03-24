import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, UserPlus, Users, FileText,
  Wrench, Receipt, Handshake, BookUser, ClipboardList,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/contacts', icon: BookUser, label: 'Contacts' },
  { to: '/leads', icon: UserPlus, label: 'Leads' },
  { to: '/surveys', icon: ClipboardList, label: 'Surveys' },
  { to: '/deals', icon: Handshake, label: 'Deals' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/quotes', icon: FileText, label: 'Quotes' },
  { to: '/jobs', icon: Wrench, label: 'Jobs' },
  { to: '/invoices', icon: Receipt, label: 'Invoices' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 flex flex-col shrink-0 h-full" style={{ backgroundColor: '#1a2942' }}>
      <div className="flex items-center justify-center px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="bg-white rounded-lg px-3 py-2">
          <img src="/logo.png" alt="Custom Showers" className="h-10 w-auto object-contain" />
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-white/15 text-white border-l-2 border-blue-400 pl-[10px]'
                  : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
              }`
            }>
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <p className="text-xs px-3" style={{ color: 'rgba(255,255,255,0.3)' }}>&copy; {new Date().getFullYear()} Custom Showers</p>
      </div>
    </aside>
  )
}
