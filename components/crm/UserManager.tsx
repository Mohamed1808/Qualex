'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { CrmUser, Team, UserRole } from '@/lib/crm/types'
import { listUsers, createUser, updateUser, listTeams } from '@/lib/crm/service'
import PageHeader from './ui/PageHeader'
import SlideOver from './ui/SlideOver'
import { RolePill } from './ui/Pill'
import { TableSkeleton } from './ui/Skeleton'
import EmptyState from './ui/EmptyState'

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'telesales_supervisor', label: 'Telesales Supervisor' },
  { value: 'telesales_agent', label: 'Telesales Agent' },
  { value: 'direct_sales_supervisor', label: 'DS Supervisor' },
  { value: 'direct_sales_agent', label: 'DS Agent' },
]

export default function UserManager() {
  const [users, setUsers] = useState<CrmUser[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [historyFor, setHistoryFor] = useState<CrmUser | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<CrmUser | null>(null)

  async function reload() {
    const [u, t] = await Promise.all([listUsers(), listTeams()])
    setUsers(u); setTeams(t)
    setLoading(false)
  }
  useEffect(() => { reload() }, [])

  async function toggle(u: CrmUser) {
    await updateUser(u.id, { is_active: !u.is_active }, u.is_active ? 'Deactivated' : 'Activated')
    setConfirmToggle(null)
    toast.success(u.is_active ? 'User deactivated' : 'User activated')
    reload()
  }
  async function setRole(u: CrmUser, role: UserRole) {
    await updateUser(u.id, { role }, `Role changed to ${role}`)
    reload()
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        crumbs={[{ label: 'CRM', href: '/crm' }]}
        title="User Management"
        subtitle={`${users.length} users`}
        action={<button onClick={() => setCreating(true)} className="bg-[#5757e6] hover:bg-[#4444cc] text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">+ New User</button>}
      />

      <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white z-[1]">
              <tr className="border-b border-[#e5e7eb] text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} cols={6} />
              ) : users.length === 0 ? (
                <tr><td colSpan={6}><EmptyState icon="🧑‍💼" title="No users yet" action={{ label: '+ New User', onClick: () => setCreating(true) }} /></td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="border-b border-[#e5e7eb] last:border-0 hover:bg-[#f3f4f6] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-[#111827] font-medium">{u.full_name}</p>
                    <p className="text-xs text-[#6B7280]">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#4B5563]">{u.title ?? '—'}</td>
                  <td className="px-4 py-3">
                    <select value={u.role} onChange={(e) => setRole(u, e.target.value as UserRole)}
                      className="bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-xs rounded-lg px-2 py-1 focus:outline-none">
                      {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#4B5563]">{teams.find((t) => t.id === u.team_id)?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'text-[#22C55E] bg-[#22C55E]/15' : 'text-[#6B7280] bg-[#6B7280]/15'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                    <button onClick={() => setHistoryFor(u)} className="text-xs text-[#5757e6] hover:underline">History</button>
                    <button onClick={() => setConfirmToggle(u)} className="text-xs text-[#4B5563] hover:text-[#111827]">{u.is_active ? 'Deactivate' : 'Activate'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {creating && <UserForm teams={teams} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload() }} />}

      {historyFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setHistoryFor(null)}>
          <div className="bg-white border border-[#e5e7eb] rounded-xl w-full max-w-md p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-[#111827] mb-3">{historyFor.full_name} — Activity</h3>
            <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
              {historyFor.history.slice().reverse().map((h, i) => (
                <div key={i} className="text-xs bg-[#f3f4f6] rounded-lg px-3 py-2">
                  <span className="text-[#111827]">{h.action}</span>
                  <span className="text-[#4B5563] block text-[10px] mt-0.5">{new Date(h.at).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setHistoryFor(null)} className="mt-4 w-full text-sm text-[#6B7280] hover:text-[#111827] border border-[#e5e7eb] rounded-lg py-2">Close</button>
          </div>
        </div>
      )}

      {confirmToggle && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setConfirmToggle(null)}>
          <div className="bg-white border border-[#e5e7eb] rounded-xl w-full max-w-sm p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-[#111827] mb-1">
              {confirmToggle.is_active ? 'Deactivate' : 'Activate'} {confirmToggle.full_name}?
            </h3>
            <p className="text-xs text-[#6B7280] mb-4">
              {confirmToggle.is_active ? 'They will lose access and stop receiving new leads.' : 'They will regain access to the CRM.'}
            </p>
            <div className="flex gap-2">
              <button onClick={() => toggle(confirmToggle)}
                className={`flex-1 text-sm font-medium rounded-lg py-2 text-white transition-colors ${confirmToggle.is_active ? 'bg-[#F26161] hover:bg-[#DC2626]' : 'bg-[#22C55E] hover:bg-[#16A34A]'}`}>
                {confirmToggle.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => setConfirmToggle(null)} className="px-4 text-sm text-[#6B7280] hover:text-[#111827] border border-[#e5e7eb] rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function UserForm({ teams, onClose, onSaved }: { teams: Team[]; onClose: () => void; onSaved: () => void }) {
  const [full_name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [role, setRole] = useState<UserRole>('telesales_agent')
  const [team_id, setTeam] = useState('')
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)

  const nameError = touched && !full_name.trim() ? 'Full name is required' : null
  const emailError = touched && !email.trim() ? 'Email is required' : touched && email.trim() && !/^\S+@\S+\.\S+$/.test(email) ? 'Enter a valid email' : null

  async function save() {
    setTouched(true)
    if (!full_name.trim() || !email.trim() || emailError) { toast.error('Fix the highlighted fields'); return }
    setSaving(true)
    await createUser({ full_name: full_name.trim(), email: email.trim(), title: title.trim() || null, role, team_id: team_id || null, is_active: true })
    setSaving(false)
    toast.success('User created')
    onSaved()
  }

  return (
    <SlideOver
      title="New User"
      onClose={onClose}
      footer={
        <>
          <button onClick={save} disabled={saving} className="flex-1 bg-[#5757e6] hover:bg-[#4444cc] disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors">{saving ? 'Saving…' : 'Create User'}</button>
          <button onClick={onClose} className="px-4 text-sm text-[#6B7280] hover:text-[#111827]">Cancel</button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Full name" error={nameError}>
          <input value={full_name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)} className={errCls(inputCls, !!nameError)} />
        </Field>
        <Field label="Email" error={emailError}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched(true)} className={errCls(inputCls, !!emailError)} />
        </Field>
        <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sales Agent" className={inputCls} /></Field>
        <Field label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={inputCls}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>
        <Field label="Team">
          <select value={team_id} onChange={(e) => setTeam(e.target.value)} className={inputCls}>
            <option value="">No team</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
      </div>
      {role && (
        <div className="mt-4">
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wide mb-1">Preview</p>
          <RolePill role={role} />
        </div>
      )}
    </SlideOver>
  )
}

function errCls(base: string, hasError: boolean) {
  return hasError ? base.replace('border-[#e5e7eb]', 'border-[#F26161]').replace('focus:ring-[#5757e6]', 'focus:ring-[#F26161]') : base
}

const inputCls = 'w-full mt-1 bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]'
function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string | null }) {
  return (
    <div>
      <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">{label}</label>
      {children}
      {error && <p className="text-[11px] text-[#F26161] mt-1">{error}</p>}
    </div>
  )
}
