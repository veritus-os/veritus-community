import { NavLink } from 'react-router-dom'

export default function ModuleSectionNav({ items }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-sky-100 bg-white p-3 shadow-sm">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end ?? true}
          className={({ isActive }) =>
            `rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              isActive ? 'bg-sky-700 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  )
}
