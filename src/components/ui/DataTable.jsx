import { useState } from 'react'
import { ChevronUp, ChevronDown, Search } from 'lucide-react'

export default function DataTable({
  columns,
  data,
  onRowClick,
  searchable = true,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No records found',
  actions,
}) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  const filtered = data.filter((row) =>
    !query ||
    columns.some((col) => {
      const val = col.accessor ? col.accessor(row) : row[col.key]
      return String(val ?? '').toLowerCase().includes(query.toLowerCase())
    })
  )

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const col = columns.find((c) => c.key === sortKey)
        const aVal = col?.accessor ? col.accessor(a) : a[sortKey]
        const bVal = col?.accessor ? col.accessor(b) : b[sortKey]
        const cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), undefined, { numeric: true })
        return sortDir === 'asc' ? cmp : -cmp
      })
    : filtered

  const handleSort = (key) => {
    if (!key) return
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {(searchable || actions) && (
        <div className="flex items-center justify-between gap-3">
          {searchable && (
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                    className={`px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${
                      col.sortable !== false ? 'cursor-pointer hover:text-slate-700 select-none' : ''
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key && (
                        sortDir === 'asc'
                          ? <ChevronUp className="w-3 h-3" />
                          : <ChevronDown className="w-3 h-3" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-400">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                sorted.map((row, i) => (
                  <tr
                    key={row.id ?? i}
                    onClick={() => onRowClick?.(row)}
                    className={`${onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''} transition-colors`}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {col.render
                          ? col.render(col.accessor ? col.accessor(row) : row[col.key], row)
                          : col.accessor
                            ? col.accessor(row)
                            : row[col.key] ?? '—'
                        }
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {sorted.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-500">{sorted.length} record{sorted.length !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>
    </div>
  )
}
